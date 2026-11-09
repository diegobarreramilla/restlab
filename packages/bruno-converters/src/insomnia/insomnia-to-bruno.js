import each from 'lodash/each';
import get from 'lodash/get';
import jsyaml from 'js-yaml';
import { buildImportedItemsBreakdown, validateSchema, transformItemsInCollection, hydrateSeqInCollection, uuid } from '../common';
import { buildV5Environments, buildV4Environments } from './env-utils';

const parseGraphQL = (text) => {
  try {
    const graphql = JSON.parse(text);

    return {
      query: normalizeVariables(graphql.query),
      variables: JSON.stringify(graphql.variables, null, 2)
    };
  } catch (e) {
    return {
      query: '',
      variables: ''
    };
  }
};

const addSuffixToDuplicateName = (item, index, allItems) => {
  // Check if the request name already exist and if so add a number suffix
  const nameSuffix = allItems.reduce((nameSuffix, otherItem, otherIndex) => {
    if (otherItem.name === item.name && otherIndex < index) {
      nameSuffix++;
    }
    return nameSuffix;
  }, 0);
  return nameSuffix !== 0 ? `${item.name}_${nameSuffix}` : item.name;
};

const regexVariable = new RegExp('{{.*?}}', 'g');

const normalizeVariables = (value) => {
  value = String(value ?? '');
  const variables = value.match(regexVariable) || [];
  each(variables, (variable) => {
    value = value.replace(variable, variable.replace('_.', '').replaceAll(' ', ''));
  });
  return value;
};

const transformInsomniaRequestItem = (request, index, allRequests) => {
  const name = addSuffixToDuplicateName(request, index, allRequests);

  const brunoRequestItem = {
    uid: uuid(),
    name,
    type: 'http-request',
    request: {
      url: normalizeVariables(request.url),
      method: request.method,
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null
      },
      headers: [],
      params: [],
      body: {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        formUrlEncoded: [],
        multipartForm: []
      }
    }
  };

  each(request.headers, (header) => {
    brunoRequestItem.request.headers.push({
      uid: uuid(),
      name: header.name,
      value: normalizeVariables(header.value),
      description: header.description,
      enabled: !header.disabled
    });
  });

  each(request.parameters, (param) => {
    brunoRequestItem.request.params.push({
      uid: uuid(),
      name: param.name,
      value: normalizeVariables(param.value),
      description: param.description,
      type: 'query',
      enabled: !param.disabled
    });
  });

  each(request.pathParameters, (param) => {
    brunoRequestItem.request.params.push({
      uid: uuid(),
      name: param.name,
      value: normalizeVariables(param.value),
      description: '',
      type: 'path',
      enabled: true
    });
  });

  const authType = get(request, 'authentication.type', '');

  if (authType === 'basic') {
    brunoRequestItem.request.auth.mode = 'basic';
    brunoRequestItem.request.auth.basic = {
      username: normalizeVariables(get(request, 'authentication.username', '')),
      password: normalizeVariables(get(request, 'authentication.password', ''))
    };
  } else if (authType === 'bearer') {
    brunoRequestItem.request.auth.mode = 'bearer';
    brunoRequestItem.request.auth.bearer = {
      token: normalizeVariables(get(request, 'authentication.token', ''))
    };
  }

  const bodyMimeType = get(request, 'body.mimeType');
  const mimeType = (bodyMimeType || '').split(';')[0];

  if (mimeType === 'application/json') {
    brunoRequestItem.request.body.mode = 'json';
    brunoRequestItem.request.body.json = normalizeVariables(request.body.text);
  } else if (mimeType === 'application/x-www-form-urlencoded') {
    brunoRequestItem.request.body.mode = 'formUrlEncoded';
    each(request.body.params, (param) => {
      brunoRequestItem.request.body.formUrlEncoded.push({
        uid: uuid(),
        name: param.name,
        value: normalizeVariables(param.value),
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'multipart/form-data') {
    brunoRequestItem.request.body.mode = 'multipartForm';
    each(request.body.params, (param) => {
      brunoRequestItem.request.body.multipartForm.push({
        uid: uuid(),
        type: 'text',
        name: param.name,
        value: normalizeVariables(param.value),
        description: param.description,
        enabled: !param.disabled
      });
    });
  } else if (mimeType === 'text/plain' || (bodyMimeType === '' && request.body?.text)) {
    brunoRequestItem.request.body.mode = 'text';
    brunoRequestItem.request.body.text = normalizeVariables(request.body.text);
  } else if (mimeType === 'text/xml' || mimeType === 'application/xml') {
    brunoRequestItem.request.body.mode = 'xml';
    brunoRequestItem.request.body.xml = normalizeVariables(request.body.text);
  } else if (mimeType === 'application/graphql') {
    brunoRequestItem.type = 'graphql-request';
    brunoRequestItem.request.body.mode = 'graphql';
    brunoRequestItem.request.body.graphql = parseGraphQL(request.body.text);
  }

  const settings = {
    encodeUrl: request.settings?.encodeUrl !== false && request.settingEncodeUrl !== false, // handles v4 and v5 import
    forwardAuthorizationHeader: false
  };

  brunoRequestItem.settings = settings;

  return brunoRequestItem;
};

const isInsomniaV5Export = (data) => {
  // V5 format has a type property at the root level
  if (data.type && data.type.startsWith('collection.insomnia.rest/5')) {
    return true;
  }
  return false;
};

/**
 * Counts every entry of a v5 collection tree, including entries the converter cannot represent.
 */
const countInsomniaV5Items = (items = []) => {
  if (!Array.isArray(items)) {
    return 0;
  }

  return items.reduce((count, item) => count + 1 + countInsomniaV5Items(item?.children), 0);
};

/**
 * A v5 export has one environments object with optional sub-environments. `buildV5Environments`
 * turns the base environment and every sub-environment into a Bruno environment.
 */
const countInsomniaV5Environments = (environments) => {
  if (!environments || typeof environments !== 'object') {
    return 0;
  }

  const subEnvironments = Array.isArray(environments.subEnvironments) ? environments.subEnvironments.length : 0;
  return 1 + subEnvironments;
};

const parseInsomniaV5Collection = (data) => {
  const brunoCollection = {
    name: data.name || 'Untitled Collection',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };
  const issues = [];

  try {
    // Parse the collection items
    const parseCollectionItems = (items, allItems = [], parentPath = '') => {
      if (!Array.isArray(items)) {
        throw new Error('Invalid items format: expected array');
      }

      return items
        .map((item, index) => {
          const itemName = item?.name || `Item ${index + 1}`;
          const itemPath = parentPath ? `${parentPath} / ${itemName}` : itemName;

          if (!item || typeof item !== 'object') {
            issues.push({
              path: itemPath,
              severity: 'error',
              message: 'Malformed collection item (not an object)'
            });
            return null;
          }

          // In v5, requests might be defined with method property or meta.type
          if (item.method && item.url) {
            const request = {
              _id: item.meta?.id || uuid(),
              name: item.name || 'Untitled Request',
              url: item.url || '',
              method: item.method || '',
              headers: item.headers || [],
              parameters: item.parameters || [],
              pathParameters: item.pathParameters || [],
              authentication: item.authentication || {},
              body: item.body || {},
              settings: item.settings || {}
            };
            return transformInsomniaRequestItem(request, index, allItems);
          } else if (item.children && Array.isArray(item.children)) {
            // Process folder
            return {
              uid: uuid(),
              name: item.name || 'Untitled Folder',
              type: 'folder',
              items: parseCollectionItems(item.children, item.children, itemPath)
            };
          }

          issues.push({
            path: itemPath,
            severity: 'error',
            message: 'Unsupported collection item (missing request method, URL or children)',
            sourceItem: item
          });
          return null;
        })
        .filter(Boolean);
    };

    if (data.collection && Array.isArray(data.collection)) {
      brunoCollection.items = parseCollectionItems(data.collection, data.collection);
    }

    // Parse environments if available
    if (data.environments) {
      brunoCollection.environments = buildV5Environments(data.environments);
    }

    return {
      collection: brunoCollection,
      issues,
      totalItems: countInsomniaV5Items(data.collection) + countInsomniaV5Environments(data.environments)
    };
  } catch (err) {
    console.error('Error parsing collection:', err);
    throw new Error('An error occurred while parsing the Insomnia v5 collection: ' + err.message);
  }
};

const parseInsomniaCollection = (data) => {
  const brunoCollection = {
    name: '',
    uid: uuid(),
    version: '1',
    items: [],
    environments: []
  };
  const issues = [];

  try {
    const insomniaResources = get(data, 'resources', []);
    const insomniaCollection = insomniaResources.find((resource) => resource._type === 'workspace');

    if (!insomniaCollection) {
      throw new Error('Collection not found inside Insomnia export');
    }

    brunoCollection.name = insomniaCollection.name;

    const requestsAndFolders
      = insomniaResources.filter((resource) => resource._type === 'request' || resource._type === 'request_group')
        || [];

    function createFolderStructure(resources, parentId = null, parentPath = '') {
      const requestGroups
        = resources.filter((resource) => resource._type === 'request_group' && resource.parentId === parentId) || [];
      const requests = resources.filter((resource) => resource._type === 'request' && resource.parentId === parentId);

      const folders = requestGroups.map((folder, index, allFolder) => {
        const name = addSuffixToDuplicateName(folder, index, allFolder);
        const itemPath = parentPath ? `${parentPath} / ${name}` : name;

        return {
          uid: uuid(),
          name,
          type: 'folder',
          items: createFolderStructure(resources, folder._id, itemPath)
        };
      });

      const requestItems = requests
        .map((request, index, allRequests) => {
          const itemName = request.name || `Item ${index + 1}`;
          const itemPath = parentPath ? `${parentPath} / ${itemName}` : itemName;

          if (!request.method || !request.url) {
            issues.push({
              path: itemPath,
              severity: 'error',
              message: 'Missing or invalid request method or URL',
              sourceItem: request
            });
            return null;
          }

          return transformInsomniaRequestItem(request, index, allRequests);
        })
        .filter(Boolean);

      return folders.concat(requestItems);
    }

    brunoCollection.items = createFolderStructure(requestsAndFolders, insomniaCollection._id);

    // Count the source items reachable from the workspace. Orphaned resources are not part of
    // the exported collection and are therefore not part of the total.
    const countSourceItems = (parentId) => {
      const children = requestsAndFolders.filter((resource) => resource.parentId === parentId);
      return children.reduce(
        (count, child) => count + 1 + (child._type === 'request_group' ? countSourceItems(child._id) : 0),
        0
      );
    };
    const environmentCount = insomniaResources.filter((resource) => resource._type === 'environment').length;
    const totalItems = countSourceItems(insomniaCollection._id) + environmentCount;

    // Build environments from resources
    brunoCollection.environments = buildV4Environments(insomniaResources, insomniaCollection._id);
    return { collection: brunoCollection, issues, totalItems };
  } catch (err) {
    console.error('Error parsing collection:', err);
    throw new Error('An error occurred while parsing the Insomnia collection: ' + err.message);
  }
};

export const insomniaToBrunoWithReport = (insomniaCollection) => {
  try {
    if (typeof insomniaCollection !== 'object') {
      insomniaCollection = jsyaml.load(insomniaCollection, { schema: jsyaml.JSON_SCHEMA });
    }
    const parsed = isInsomniaV5Export(insomniaCollection)
      ? parseInsomniaV5Collection(insomniaCollection)
      : parseInsomniaCollection(insomniaCollection);

    const transformedCollection = transformItemsInCollection(parsed.collection);
    const hydratedCollection = hydrateSeqInCollection(transformedCollection);
    const validatedCollection = validateSchema(hydratedCollection);

    const importedBreakdown = buildImportedItemsBreakdown(validatedCollection);
    const importedItems = importedBreakdown.requests + importedBreakdown.folders + importedBreakdown.environments;

    return {
      collection: validatedCollection,
      issues: parsed.issues,
      totalItems: parsed.totalItems,
      importedItems,
      importedBreakdown
    };
  } catch (err) {
    console.error(err);
    throw new Error('Import collection failed: ' + err.message);
  }
};

export const insomniaToBruno = (insomniaCollection) => insomniaToBrunoWithReport(insomniaCollection).collection;

export default insomniaToBruno;
