'use strict';

import { describe, it, beforeEach, afterEach } from 'node:test';
import path from 'path';
import assert from 'node:assert/strict';
import { Robot, TextMessage }  from 'hubot';
import MockAdapter from './fixtures/MockAdapter.mjs';

describe('auth', () => {
  let robot = null;

  beforeEach(async () => {
    process.env.HUBOT_AUTH_ADMIN = '1,2';
    robot = new Robot(MockAdapter, false, 'TestAuthBot');

    await robot.loadAdapter();
    await robot.loadFile(path.resolve('src/'), 'Auth.mjs');
    
    robot.adapter.on('connected', async () => {
      robot.brain.userForId('1', {
        name: 'admin',
        real_name: 'Admin User',
        room: '#test'
      });
      robot.brain.userForId('2', {
        name: 'admin2',
        real_name: 'Admin User 2',
        room: '#test'
      });
      robot.brain.userForId('3', {
        name: 'user',
        real_name: 'Regular User',
        room: '#test'
      });
      robot.brain.userForId('4', {
        name: 'user2',
        real_name: 'Regular User 2',
        room: '#test'
      });
    });

    await robot.run();
  });

  afterEach(() => {
    robot.shutdown();
  });

  describe('Assigning roles', () => 
    it('should match admins not allowed', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], 'Sorry, only admins can assign roles.')
        wasCalled = true
      })

      const nonAdminUser = robot.brain.userForId('3');
      const message = new TextMessage(nonAdminUser, 'TestAuthBot admin has jester role');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    }),
    it('should match fakeuser does not exist', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], 'fakeuser does not exist')
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const message = new TextMessage(adminUser, 'TestAuthBot fakeuser has jester role');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    }),
    it('should say the role has already been assigned', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        if(strings[0].includes('OK')) return
        assert.equal(strings.length, 1)
        assert.equal(strings[0], `user2 already has the 'jester' role.`)
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const message = new TextMessage(adminUser, 'TestAuthBot user2 has jester role');
      await robot.receive(message);
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    }),
    it('should say admin can only be defined in env variable', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], "Sorry, the 'admin' role can only be defined in the HUBOT_AUTH_ADMIN env variable.")
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const message = new TextMessage(adminUser, 'TestAuthBot admin has admin role');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    }),
    it('should say the role has been assigned', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], `OK, admin has the 'jester' role.`)
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const message = new TextMessage(adminUser, 'TestAuthBot admin has jester role');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    })
  );

  describe('Removing roles', () => 
    it('should say the role has been removed', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], `OK, user doesn't have the 'jester' role.`)
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const user = robot.brain.userForId('3');
      user.roles = user.roles || []
      user.roles.push('jester');
      const message = new TextMessage(adminUser, 'TestAuthBot user doesn\'t have jester role');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    })
  );

  describe('Checking who has role', () => 
    it('should list the people with role', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], `The following people have the 'jester' role: user`)
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const user = robot.brain.userForId('3');
      user.roles = user.roles || []
      user.roles.push('jester');
      const message = new TextMessage(adminUser, 'TestAuthBot who has jester role');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    })
  );

  describe('List all roles', () => 
    it('should list all roles', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], 'The following roles are available: jester')
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const user = robot.brain.userForId('3');
      user.roles = user.roles || []
      user.roles.push('jester');
      const message = new TextMessage(adminUser, 'TestAuthBot list assigned roles');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    })
  );

  describe('Check name', () => 
    it('checks user name', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], 'Your name is: admin.')
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const message = new TextMessage(adminUser, 'TestAuthBot what is my name');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    })
  );

  describe('Check ID', () => 
    it('checks user id', async () => {
      let wasCalled = false
      robot.adapter.on('reply', async (envelope, ...strings) => {
        assert.equal(strings.length, 1)
        assert.equal(strings[0], 'Your ID is: 1.')
        wasCalled = true
      })

      const adminUser = robot.brain.userForId('1');
      const message = new TextMessage(adminUser, 'TestAuthBot what is my id');
      await robot.receive(message);
      
      assert.deepEqual(wasCalled, true)
    })
  );
});
