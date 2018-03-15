/**
 * Copyright (c) 2017-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

'use strict';

import Deferred from 'fbjs/lib/Deferred';
import type {PartialResponder, ConnectionStatus, Payload} from 'rsocket-types';
import {RSocketClient} from 'rsocket-core';
import {RSocketServer} from 'rsocket-core';
import {Flowable, Single} from 'rsocket-flowable';

import RSocketWebSocketServer from 'rsocket-websocket-server';
import RSocketTCPServer from 'rsocket-tcp-server';

import yargs from 'yargs';

const argv = yargs
  .usage('$0 --host <host> --port <port>')
  .options({
    host: {
      default: '0.0.0.0',
      describe: 'server hostname.',
      type: 'string',
    },
    port: {
      default: 8080,
      describe: 'server port.',
      type: 'string',
    },
    port: {
      default: 8080,
      describe: 'server port.',
      type: 'string',
    },
    protocol: {
      default: 'ws',
      describe: 'the protocol.',
      type: 'string',
    },
  })
  .choices('protocol', ['ws', 'tcp'])
  .help().argv;

Promise.resolve(run(argv)).then(
  () => {
    console.log('exit');
    process.exit(0);
  },
  error => {
    console.log('aj');
    console.error(error.stack);
    process.exit(1);
  },
);

function make(data: string): Payload<string, string> {
  return {
    data: data,
    metadata: '',
  };
}

function logRequest(type: string, payload: Payload<string, string>) {
  console.log(
    `Got ${type} with payload: data: ${payload.data || 'null'}, metadata: ${payload.metadata || 'null'}`,
  );
}

class Responder implements PartialResponder<string, string> {
  /**
   * Fire and Forget interaction model of `ReactiveSocket`. The returned
   * Publisher resolves when the passed `payload` is successfully handled.
   */
  fireAndForget(payload): void {
    logRequest('fnf', payload);
  }

  /**
   * Request-Response interaction model of `ReactiveSocket`. The returned
   * Publisher resolves with the response.
   */
  requestResponse(payload): Single<Payload<string, string>> {
    logRequest('requestResponse', payload);
    return Single.error(new Error());
  }

  /**
   * Request-Stream interaction model of `ReactiveSocket`. The returned
   * Publisher returns values representing the response(s).
   */
  requestStream(payload): Flowable<Payload<string, string>> {
    logRequest('requestStream', payload);
    return Flowable.just(make('Hello '), make('world!'));
  }

  /**
   * Request-Channel interaction model of `ReactiveSocket`. The returned
   * Publisher returns values representing the response(s).
   */
  requestChannel(
    payloads: Flowable<Payload<string, string>>,
  ): Flowable<Payload<string, string>> {
    return Flowable.error(new Error());
  }

  /**
   * Metadata-Push interaction model of `ReactiveSocket`. The returned Publisher
   * resolves when the passed `payload` is successfully handled.
   */
  metadataPush(payload): Single<void> {
    logRequest('metadataPush', payload);
    return Single.error(new Error());
  }
}

type ServerOptions = {
  host?: string,
  port: number,
};

function getTransport(protocol: string, options: ServerOptions) {
  switch (protocol) {
    case 'tcp':
      return new RSocketTCPServer({...options});
    case 'ws':
    default:
      return new RSocketWebSocketServer({...options});
  }
}

async function run(options) {
  const deferred = new Deferred();

  const serverOptions: ServerOptions = {
    host: options.host,
    port: options.port,
  };

  let server = new RSocketServer({
    getRequestHandler: payload => {
      return new Responder();
    },
    transport: getTransport(options.protocol, serverOptions),
  });
  server.start();

  console.log(`Server started on ${options.host}:${options.port}`);

  return deferred.getPromise();
}
