import {Parser, ImportSource} from 'webpack';
import {Hook} from 'tapable';
import {Expression, Statement} from 'estree';

export function createParser({
  componentPath,
  importSpecifierTap,
  evaluateTap,
}: {
  componentPath?: string;
  importSpecifierTap?: Hook<Statement, ImportSource, string, string>['tap'];
  evaluateTap?: Hook<Expression>['tap'];
}): Parser {
  return ({
    state: {
      module: {
        resource: componentPath ? componentPath : 'abc/path',
      },
    },
    hooks: {
      importSpecifier: {
        get: jest.fn(),
        for: jest.fn(),
        taps: [],
        interceptors: [],
        call: jest.fn(),
        promise: jest.fn(),
        callAsync: jest.fn(),
        compile: jest.fn(),
        tap: importSpecifierTap ? importSpecifierTap : jest.fn(),
        tapAsync: jest.fn(),
        tapPromise: jest.fn(),
        intercept: jest.fn(),
      },
      evaluate: {
        get: jest.fn(),
        for: jest.fn(),
        taps: [],
        interceptors: [],
        call: jest.fn(),
        promise: jest.fn(),
        callAsync: jest.fn(),
        compile: jest.fn(),
        tap: evaluateTap ? evaluateTap : jest.fn(),
        tapAsync: jest.fn(),
        tapPromise: jest.fn(),
        intercept: jest.fn(),
      },
    },
  } as unknown) as Parser;
}
