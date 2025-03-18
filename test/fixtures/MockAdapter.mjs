'use strict';

import { Adapter } from 'hubot';  // Adjust the import path if needed

class MockAdapter extends Adapter {
  async send(envelope, ...strings) {
    this.emit('send', envelope, strings);
  }

  async reply(envelope, ...strings) {
    this.emit('reply', envelope, strings);
  }

  async topic(envelope, ...strings) {
    this.emit('topic', envelope, strings);
  }

  async play(envelope, ...strings) {
    this.emit('play', envelope, strings);
  }

  async run() {
    this.emit('connected');
  }

  close() {
    this.emit('closed');
  }
}

// Export the use method as an ESM export
export const use = (robot) => new MockAdapter(robot);
