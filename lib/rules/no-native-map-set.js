const IMMUTABLE_IMPORT_NAME = 'immutable';

function importIncludesType({ specifiers = [] }, type) {
    return specifiers.some(specifier => (
        specifier.type === 'ImportSpecifier' && specifier.imported.name === type
    ));
}

function importIsImmutable(importDeclaration) {
    return importDeclaration.source.value === IMMUTABLE_IMPORT_NAME;
}

function defaultImportName({ specifiers = [] }) {
    const specifier = specifiers.find(specifier => (
        specifier.type === 'ImportDefaultSpecifier'
    ));

    return specifier && specifier.local.name;
}

function objPatternIncludes({ properties = [] }, key) {
    return properties.some(prop => prop.key.name === key);
}

module.exports = context => {
    let hasMapImport = false;
    let hasSetImport = false;
    let immutableAlias = '';

    return {
        ImportDeclaration(node) {
            if (!importIsImmutable(node)) return;

            if (importIncludesType(node, 'Map')) {
                hasMapImport = true;
            }

            if (importIncludesType(node, 'Set')) {
                hasSetImport = true;
            }

            immutableAlias = defaultImportName(node) || immutableAlias;
        },
        CallExpression({ callee, parent, arguments:args = [] }) {
            // var immutable = require('immutable');
            if (
                callee.name === 'require' &&
                parent.type === 'VariableDeclarator' &&
                (args[0] && args[0].value === IMMUTABLE_IMPORT_NAME)
            ) {
                immutableAlias = parent.id.name;;
            }
        },
        VariableDeclarator(node) {
            if (
                node.init &&
                node.init.type === 'MemberExpression' &&
                node.init.object.name === immutableAlias &&
                ['Map', 'Set'].some(name => name === node.id.name)
            ) {
                if (node.init.property.name === 'Map') {
                    hasMapImport = true;
                }

                if (node.init.property.name === 'Set') {
                    hasSetImport = true;
                }
            };

            if (
                node.id.type === 'ObjectPattern' &&
                node.init &&
                node.init.name === immutableAlias
            ) {
                const includesMap = objPatternIncludes(node.id, 'Map');
                const includesSet = objPatternIncludes(node.id, 'Set');

                if (includesMap) {
                    hasMapImport = true;
                }

                if (includesSet) {
                    hasSetImport = true;
                }
            }

        },
        Identifier(node) {
            if (node.parent.type === 'ImportSpecifier') return;

            if (node.name === 'Map' && !hasMapImport) {
                context.report({
                    message: 'Native ES6 Map is not allowed. Use Immutable.Map()',
                    node
                });
            }

            if (node.name === 'Set' && !hasSetImport) {
                context.report({
                    message: 'Native ES6 Set is not allowed. Use Immutable.Set()',
                    node
                });
            }
        }
    }
};
