import {FindI18nImportPlugin} from '../find-i18n-imports-plugin';
import {createParser} from './utilities';

describe('FindI18nImportPlugin', () => {
  it('called importSpecifier tap with plugin name', () => {
    const mockTap = jest.fn();
    const parser = createParser({
      importSpecifierTap: mockTap,
    });

    const findI18nImportPlugin = new FindI18nImportPlugin();
    findI18nImportPlugin.apply(parser);

    expect(mockTap).toHaveBeenCalledWith(
      'FindI18nImportPlugin',
      expect.any(Function),
    );
  });

  it('adds to i18nImports if exportName is useI18n', () => {
    const componentPath = '/abc/path';
    const exportName = 'useI18n';
    const identifierName = 'useI18nAlias';

    const parser = createParser({
      componentPath,
      importSpecifierTap: jest.fn((_name, callback) => {
        callback({} as any, '', exportName, identifierName);
      }),
    });

    const findI18nImportPlugin = new FindI18nImportPlugin();
    findI18nImportPlugin.apply(parser);

    expect(parser.state.i18nImports).not.toBeUndefined();
    const importByPath = parser.state.i18nImports.get(componentPath);

    expect(importByPath).not.toBeUndefined();
    expect(importByPath.get(exportName)).toBe(identifierName);
  });

  it('adds to i18nImports if exportName is withI18n', () => {
    const componentPath = '/abc/path';
    const exportName = 'withI18n';
    const identifierName = 'withI18nAlias';

    const parser = createParser({
      componentPath,
      importSpecifierTap: jest.fn((_name, callback) => {
        callback({} as any, '', exportName, identifierName);
      }),
    });

    const findI18nImportPlugin = new FindI18nImportPlugin();
    findI18nImportPlugin.apply(parser);

    expect(parser.state.i18nImports).not.toBeUndefined();
    const importByPath = parser.state.i18nImports.get(componentPath);

    expect(importByPath).not.toBeUndefined();
    expect(importByPath.get(exportName)).toBe(identifierName);
  });

  it('adds to i18nImports twice when both type of export exist', () => {
    const componentPath = '/abc/path';
    const exportNameOne = 'useI18n';
    const identifierNameOne = 'useI18nAlias';
    const exportNameTwo = 'withI18n';
    const identifierNameTwo = 'withI18nAlias';

    const parser = createParser({
      componentPath,
      importSpecifierTap: jest.fn((_name, callback) => {
        callback({} as any, '', exportNameOne, identifierNameOne);
        callback({} as any, '', exportNameTwo, identifierNameTwo);
      }),
    });

    const findI18nImportPlugin = new FindI18nImportPlugin();
    findI18nImportPlugin.apply(parser);

    expect(parser.state.i18nImports).not.toBeUndefined();
    const importByPath = parser.state.i18nImports.get(componentPath);

    expect(importByPath).not.toBeUndefined();
    expect(importByPath.get(exportNameOne)).toBe(identifierNameOne);
    expect(importByPath.get(exportNameTwo)).toBe(identifierNameTwo);
  });

  it('does not add to i18nImports if exportName is not useI18n or withI18n', () => {
    const componentPath = '/abc/path';
    const exportName = 'something';

    const parser = createParser({
      componentPath,
      importSpecifierTap: jest.fn((_name, callback) => {
        callback({} as any, '', exportName, 'alias');
      }),
    });

    const findI18nImportPlugin = new FindI18nImportPlugin();
    findI18nImportPlugin.apply(parser);

    expect(parser.state.i18nImports).toBeUndefined();
  });
});
