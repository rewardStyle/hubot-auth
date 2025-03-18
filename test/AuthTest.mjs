'use strict';

import { describe, it, beforeEach, afterEach } from 'node:test';
import path from 'path';
import assert from 'node:assert/strict';
import Hubot from 'hubot';

const { Robot, TextMessage } = Hubot;

const newTestRobot = async () => {
  process.env.PORT = '0';
  const robot = new Robot('mock-adapter', false, 'hubot');

  await robot.loadFile(path.resolve('src/'), 'Auth.mjs');
  await robot.loadAdapter('./test/fixtures/MockAdapter.mjs');

  robot.adapter.on('connected', () => robot.brain.userForId('1', {
    name: 'admin',
    real_name: 'Admin User',
    room: '#test'
  }));

  return robot;
};

describe('auth', () => {
  let robot = null;

  beforeEach(async () => {
    robot = await newTestRobot();
    await robot.run();
  });

  afterEach(() => {
    robot.shutdown();
  });

  describe('when checking admin status', () => {
    it('should return true for admin user', async () => {
      const user = robot.brain.userForId('1');
      const auth = new robot.auth();
      assert.equal(auth.isAdmin(user), true);
    });

    it('should return false for non-admin user', async () => {
      const user = robot.brain.userForId('2', {
        name: 'regular',
        real_name: 'Regular User',
        room: '#test'
      });
      const auth = new robot.auth();
      assert.equal(auth.isAdmin(user), false);
    });
  });

  describe('when checking user roles', () => {
    it('should return true if user has the role', async () => {
      const user = robot.brain.userForId('1');
      const auth = new robot.auth();
      robot.brain.set('userRoles', { '1': ['admin'] });
      assert.equal(auth.hasRole(user, 'admin'), true);
    });

    it('should return false if user does not have the role', async () => {
      const user = robot.brain.userForId('1');
      const auth = new robot.auth();
      robot.brain.set('userRoles', { '1': ['user'] });
      assert.equal(auth.hasRole(user, 'admin'), false);
    });
  });
});
