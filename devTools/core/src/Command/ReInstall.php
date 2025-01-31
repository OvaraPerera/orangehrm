<?php
/**
 * OrangeHRM is a comprehensive Human Resource Management (HRM) System that captures
 * all the essential functionalities required for any enterprise.
 * Copyright (C) 2006 OrangeHRM Inc., http://www.orangehrm.com
 *
 * OrangeHRM is free software; you can redistribute it and/or modify it under the terms of
 * the GNU General Public License as published by the Free Software Foundation; either
 * version 2 of the License, or (at your option) any later version.
 *
 * OrangeHRM is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program;
 * if not, write to the Free Software Foundation, Inc., 51 Franklin Street, Fifth Floor,
 * Boston, MA  02110-1301, USA
 */

namespace OrangeHRM\DevTools\Command;

use Conf;
use OrangeHRM\Authentication\Dto\UserCredential;
use OrangeHRM\Config\Config;
use OrangeHRM\Core\Traits\ORM\EntityManagerHelperTrait;
use OrangeHRM\Entity\Organization;
use OrangeHRM\Entity\User;
use OrangeHRM\Framework\Http\Request;
use OrangeHRM\Installer\Framework\HttpKernel;
use OrangeHRM\Installer\Util\AppSetupUtility;
use OrangeHRM\Installer\Util\Connection;
use OrangeHRM\Installer\Util\StateContainer;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

class ReInstall extends Command
{
    use EntityManagerHelperTrait;

    protected static $defaultName = 'instance:reinstall';

    /**
     * @inheritDoc
     */
    protected function configure()
    {
        $this->setDescription('Re-install the instance');
    }

    /**
     * @inheritDoc
     */
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        if (!Config::isInstalled()) {
            $io->warning('Application not installed.');
            return Command::INVALID;
        }

        $kernel = new HttpKernel('dev', false);
        $request = new Request();
        $kernel->handleRequest($request);

        /** @var Organization $org */
        $org = $this->getRepository(Organization::class)->find(1);
        $organizationName = $org->getName();
        $countryCode = $org->getCountry();

        /** @var User $user */
        $user = $this->getRepository(User::class)->findOneBy(['createdBy' => null]);
        $adminUsername = $user->getUserName();
        $adminHashedPassword = $user->getUserPassword();
        $firstName = $user->getEmployee()->getFirstName();
        $lastName = $user->getEmployee()->getLastName();
        $email = $user->getEmployee()->getWorkEmail();
        $contact = $user->getEmployee()->getWorkTelephone();


        $pathToConf = Config::get(Config::CONF_FILE_PATH);
        require_once $pathToConf;
        $conf = new Conf();
        $dbName = $conf->getDbName();

        $sm = $this->getEntityManager()->getConnection()->createSchemaManager();
        $sm->dropDatabase($dbName);

        // DB configs
        StateContainer::getInstance()->storeDbInfo(
            $conf->getDbHost(),
            $conf->getDbPort(),
            new UserCredential($conf->getDbUser(), $conf->getDbPass()),
            $dbName
        );
        StateContainer::getInstance()->setDbType(AppSetupUtility::INSTALLATION_DB_TYPE_NEW);

        // Instance data
        StateContainer::getInstance()->storeInstanceData($organizationName, $countryCode, 'en_US', 'UTC');

        // Admin user
        StateContainer::getInstance()->storeAdminUserData(
            $firstName,
            $lastName,
            $email,
            new UserCredential($adminUsername, 'admin123'),
            $contact
        );

        $appSetupUtility = new AppSetupUtility();
        $appSetupUtility->createDatabase();
        $appSetupUtility->runMigrations('3.3.3', Config::PRODUCT_VERSION);
        $appSetupUtility->insertSystemConfiguration();

        /** @var User $user */
        $qb = Connection::getConnection()->createQueryBuilder()
            ->update('ohrm_user', 'user')
            ->set('user.user_password', ':hashedPassword')
            ->setParameter('hashedPassword', $adminHashedPassword);
        $qb->where($qb->expr()->isNull('user.created_by'))
            ->executeQuery();

        $io->success('Done');
        return Command::SUCCESS;
    }
}
