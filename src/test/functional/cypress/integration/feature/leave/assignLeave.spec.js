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

import user from '../../../fixtures/user.json';

describe('Leave - Assign Leave', function () {
  beforeEach(function () {
    cy.task('db:reset');
    cy.fixture('chars').as('strings');
    cy.intercept(
      'GET',
      '**/api/v2/leave/holidays?fromDate=2022-01-01&toDate=2022-12-31',
    ).as('getHoliday');
    cy.intercept('PUT', '**/api/v2/leave/leave-period').as('putLeavePeriod');
    cy.intercept('GET', '**/api/v2/leave/leave-period').as('getLeavePeriod');
    cy.intercept('GET', '**/api/v2/leave/leave-types*').as('getLeaveTypes');
    cy.intercept('POST', '**/api/v2/leave/leave-types').as('saveLeaveType');
    cy.intercept('GET', '**/api/v2/leave/leave-entitlements*').as(
      'getLeaveEntitlements',
    );
    cy.intercept('POST', '**/api/v2/leave/leave-entitlements').as(
      'saveLeaveEntitlements',
    );
    cy.intercept('POST', '**/api/v2/leave/leave-requests').as(
      'postLeaveRequest',
    );
    cy.intercept('POST', '**/api/v2/leave/holidays').as('postHolidays');
    cy.intercept(
      'GET',
      '**/api/v2/leave/holidays?fromDate=2022-01-01&toDate=2022-12-31',
    ).as('getHoliday');
    cy.intercept('POST', '**/api/v2/pim/employees').as('addEmployee');
    cy.intercept('POST', '**/api/v2/admin/users').as('postESSuser');
    cy.intercept(
      'GET',
      '**/api/v2/admin/validation/user-name?userName=John22*',
    ).as('getESSusername');
    cy.intercept(
      'GET',
      '**/api/v2/admin/validation/user-name?userName=Mike22*',
    ).as('getSuperusername');
    cy.fixture('user').then((data) => {
      this.adminUser = data.admin;
      this.essUser = data.john;
      this.superUser = data.mike;
    });
  });

  //Creating snapshots with leave configurations
  describe('create snapshots', function () {
    it('create snapshot with leaveperiod', function () {
      cy.loginTo(user.admin, '/leave/defineLeavePeriod');
      cy.getOXD('form').within(() => {
        cy.wait('@getLeavePeriod');
        cy.getOXD('button').contains('Save').click();
      });
      cy.wait('@putLeavePeriod').then(function () {
        cy.task('db:snapshot', {name: 'lPeriodforApplyleave'});
      });
    });
    it('create snapshot with leave type', function () {
      cy.task('db:restore', {name: 'lPeriodforApplyleave'});
      cy.loginTo(user.admin, '/leave/defineLeaveType');
      cy.wait('@getLeaveTypes');
      cy.getOXD('form').within(() => {
        cy.getOXDInput('Name').type(this.strings.leaveTypes.leavetype2);
        cy.getOXD('button').contains('Save').click();
      });
      cy.wait('@saveLeaveType').then(function () {
        cy.task('db:snapshot', {name: 'lTypesforApplyleave'});
      });
    });
  });
  //Adding Employees and creating snapshots
  describe('Add employees and create snapshots', function () {
    it('Add ESS employee', function () {
      cy.task('db:restore', {name: 'lTypesforApplyleave'});
      cy.loginTo(user.admin, '/pim/addEmployee');
      cy.getOXD('form').within(() => {
        cy.get(
          '.--name-grouped-field > :nth-child(1) > :nth-child(2) > .oxd-input',
        ).type('John');
        cy.get(':nth-child(3) > :nth-child(2) > .oxd-input').type('Perera');
        cy.getOXD('button').contains('Save').click();
      });
      cy.wait('@addEmployee').then(function () {
        cy.task('db:snapshot', {name: 'ESSemployee'});
      });
    });
    it('Add Supervisor', function () {
      cy.task('db:restore', {name: 'ESSemployee'});
      cy.loginTo(user.admin, '/pim/addEmployee');
      cy.getOXD('form').within(() => {
        cy.get(
          '.--name-grouped-field > :nth-child(1) > :nth-child(2) > .oxd-input',
        ).type('Mike');
        cy.get(':nth-child(3) > :nth-child(2) > .oxd-input').type('Combas');
        cy.getOXD('button').contains('Save').click();
      });
      cy.wait('@addEmployee').then(function () {
        cy.get(':nth-child(8) > .orangehrm-tabs-item').click();
        cy.get(
          ':nth-child(3) > :nth-child(1) > .orangehrm-action-header > .oxd-button',
        ).click();
        cy.getOXDInput('Name').type('John');
        cy.getOXD('option2').contains('John Perera').click();
        cy.getOXDInput('Reporting Method').selectOption('Direct');
        cy.getOXD('button').contains('Save').click();
        cy.task('db:snapshot', {name: 'Semployee'});
      });
    });
  });
  //Adding users and creating snapshots
  describe('Add users and create snapshots', function () {
    it('Add ESS user', function () {
      cy.task('db:restore', {name: 'Semployee'});
      cy.loginTo(user.admin, '/admin/saveSystemUser');
      cy.getOXD('form').within(() => {
        cy.getOXDInput('User Role').selectOption('ESS');
        cy.getOXDInput('Employee Name').type('John');
        cy.getOXD('option2').contains('John Perera').click();
        cy.getOXDInput('Status').selectOption('Enabled');
        cy.getOXDInput('Username').type('John22');
        cy.getOXDInput('Password').type('John@123');
        cy.getOXDInput('Confirm Password').type('John@123');
        //cy.getOXD('button').contains('Save').click();
      });
      cy.wait('@getESSusername');
      cy.getOXD('button').contains('Save').click();
      cy.wait('@postESSuser').then(function () {
        cy.task('db:snapshot', {name: 'ESSuser'});
      });
    });

    it('Add Supervisor user', function () {
      cy.task('db:restore', {name: 'ESSuser'});
      cy.loginTo(user.admin, '/admin/saveSystemUser');
      cy.getOXD('form').within(() => {
        cy.getOXDInput('User Role').selectOption('ESS');
        cy.getOXDInput('Employee Name').type('Mike');
        cy.getOXD('option2').contains('Mike Combas').click();
        cy.getOXDInput('Status').selectOption('Enabled');
        cy.getOXDInput('Username').type('Mike22');
        cy.getOXDInput('Password').type('Mike@123');
        cy.getOXDInput('Confirm Password').type('Mike@123');
      });
      cy.wait('@getSuperusername');
      cy.getOXD('button').contains('Save').click();
      cy.wait('@postESSuser').then(function () {
        cy.task('db:snapshot', {name: 'Supervisoruser'});
      });
    });
  });
  //Create snapshots with entitlements and holidays
  describe('create snapshots with entitlements and holidays', function () {
    it('create snapshot with leave entitlement', function () {
      cy.task('db:restore', {name: 'Supervisoruser'});
      //cy.task('db:restore', {name: 'lTypesforApplyleave'});
      cy.loginTo(user.admin, '/leave/addLeaveEntitlement');
      cy.wait('@getLeaveTypes');
      cy.getOXD('form').within(() => {
        cy.getOXDInput('Multiple Employees').click();
        cy.getOXDInput('Leave Type').selectOption('Casual Leave');
        cy.getOXDInput('Entitlement').type('5');
        cy.getOXD('button').contains('Save').click();
      });
      cy.get(
        ':nth-child(6) > .oxd-form-actions > .oxd-button--secondary',
      ).click();
      cy.wait('@saveLeaveEntitlements').then(function () {
        cy.task('db:snapshot', {name: 'leaveEntitlements'});
      });
    });
    it('create snapshot with holiday', function () {
      cy.task('db:restore', {name: 'leaveEntitlements'});
      cy.loginTo(user.admin, '/leave/saveHolidays');
      cy.getOXD('form').within(() => {
        cy.getOXDInput('Name').type(this.strings.chars10.text);
        cy.getOXDInput('Date').type('2022-08-03');
        cy.getOXD('button').contains('Save').click();
      });
      cy.wait('@postHolidays').then(function () {
        cy.toast('success', 'Successfully Saved');
        cy.task('db:snapshot', {name: 'holidayforleave'});
      });
    });
  });

  //Form Validations
  describe('Assign leave-form validations', function () {
    it('Assign leave-form validations', function () {
      cy.task('db:restore', {name: 'leaveEntitlements'});
      cy.loginTo(user.admin, '/leave/assignLeave');
      cy.getOXD('form').within(() => {
        cy.getOXD('button').contains('Assign').click();
        cy.getOXDInput('Employee Name').isInvalid('Required');
        cy.getOXDInput('Leave Type').isInvalid('Required');
        cy.getOXDInput('From Date').isInvalid('Required');
        cy.getOXDInput('To Date').isInvalid('Required');
        cy.getOXDInput('Comments')
          .type(this.strings.chars400.text)
          .isInvalid('Should be less than 250 characters');
        //.isInvalid('Should not exceed 250 characters');
      });
    });
    it('Assign leave-Date field validations', function () {
      cy.task('db:restore', {name: 'leaveEntitlements'});
      cy.loginTo(user.admin, '/leave/assignLeave');
      cy.getOXD('form').within(() => {
        cy.getOXDInput('From Date').type('2022-07-25');
        cy.getOXDInput('To Date').clear().type('2022-07-23');
        cy.getOXD('button').contains('Assign').click();
        cy.getOXDInput('To Date').isInvalid(
          'To date should be after from date',
        );
      });
    });
  });
});
