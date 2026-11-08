import React, { useRef, useEffect, useCallback, useState } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import { browseDirectory, showInFolder } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconTrash, IconUpload, IconCopy } from '@tabler/icons';
import path from 'utils/common/path';
import { getRevealInFolderLabel } from 'utils/common/platform';
import { REPOSITORY_URL } from 'utils/branding';
import { SettingsGroup, CheckboxSetting, SettingsField } from '../SettingsLayout';

const General = () => {
  const preferences = useSelector((state) => state.app.preferences);
  const collections = useSelector((state) => state.collections.collections);
  const dispatch = useDispatch();
  // The file input is hidden; the visible button forwards its click here.
  const inputFileCaCertificateRef = useRef();
  // The main process owns the app data folder; the renderer only reads its path.
  const [userDataPath, setUserDataPath] = useState('');
  const revealInFolderLabel = getRevealInFolderLabel();

  useEffect(() => {
    let isSubscribed = true;
    window?.ipcRenderer
      ?.invoke('renderer:get-user-data-path')
      .then((dataPath) => {
        if (isSubscribed && typeof dataPath === 'string') setUserDataPath(dataPath);
      })
      .catch((error) => console.error('Could not read the app data folder path', error));
    return () => {
      isSubscribed = false;
    };
  }, []);

  const preferencesSchema = Yup.object().shape({
    sslVerification: Yup.boolean(),
    customCaCertificate: Yup.object({
      enabled: Yup.boolean(),
      filePath: Yup.string().nullable()
    }),
    keepDefaultCaCertificates: Yup.object({
      enabled: Yup.boolean()
    }),
    storeCookies: Yup.boolean(),
    sendCookies: Yup.boolean(),
    timeout: Yup.mixed()
      .transform((value, originalValue) => {
        return originalValue === '' ? undefined : value;
      })
      .nullable()
      .test('isNumber', 'Request Timeout must be a number', (value) => {
        return value === undefined || !isNaN(value);
      })
      .test('isValidTimeout', 'Request Timeout must be greater than or equal to 0', (value) => {
        return value === undefined || Number(value) >= 0;
      }),
    autoSave: Yup.object({
      enabled: Yup.boolean(),
      interval: Yup.mixed()
        .transform((value, originalValue) => {
          return originalValue === '' ? undefined : value;
        })
        .test('isNumber', 'Save Delay must be a number', (value) => {
          return value === undefined || !isNaN(value);
        })
        .test('isValidInterval', 'Save Delay must be at least 500ms', (value) => {
          return value === undefined || Number(value) >= 500;
        })
        .test('intervalRequired', 'Save Delay is required when Auto Save is enabled', function (value) {
          return !(this.parent.enabled && (value === undefined || value === ''));
        })
    }),
    oauth2: Yup.object({
      useSystemBrowser: Yup.boolean()
    }),
    defaultLocation: Yup.string().max(1024),
    fetchNotifications: Yup.boolean()
  });

  const formik = useFormik({
    initialValues: {
      sslVerification: preferences.request.sslVerification,
      customCaCertificate: {
        enabled: get(preferences, 'request.customCaCertificate.enabled', false),
        filePath: get(preferences, 'request.customCaCertificate.filePath', null)
      },
      keepDefaultCaCertificates: {
        enabled: get(preferences, 'request.keepDefaultCaCertificates.enabled', true)
      },
      timeout: preferences.request.timeout,
      storeCookies: get(preferences, 'request.storeCookies', true),
      sendCookies: get(preferences, 'request.sendCookies', true),
      autoSave: {
        enabled: get(preferences, 'autoSave.enabled', false),
        interval: get(preferences, 'autoSave.interval', 1000)
      },
      oauth2: {
        useSystemBrowser: get(preferences, 'request.oauth2.useSystemBrowser', false)
      },
      defaultLocation: get(preferences, 'general.defaultLocation', ''),
      fetchNotifications: get(preferences, 'general.fetchNotifications', false)
    },
    validationSchema: preferencesSchema,
    onSubmit: async (values) => {
      try {
        const newPreferences = await preferencesSchema.validate(values, { abortEarly: true });
        handleSave(newPreferences);
      } catch (error) {
        console.error('Preferences validation error:', error.message);
      }
    }
  });

  const handleSave = useCallback((newPreferences) => {
    dispatch(
      savePreferences({
        ...preferences,
        request: {
          ...preferences.request,
          sslVerification: newPreferences.sslVerification,
          customCaCertificate: {
            enabled: newPreferences.customCaCertificate.enabled,
            filePath: newPreferences.customCaCertificate.filePath
          },
          keepDefaultCaCertificates: {
            enabled: newPreferences.keepDefaultCaCertificates.enabled
          },
          timeout: newPreferences.timeout,
          storeCookies: newPreferences.storeCookies,
          sendCookies: newPreferences.sendCookies,
          oauth2: {
            useSystemBrowser: newPreferences.oauth2.useSystemBrowser
          }
        },
        autoSave: {
          enabled: newPreferences.autoSave.enabled,
          interval: newPreferences.autoSave.interval
        },
        general: {
          ...preferences.general,
          defaultLocation: newPreferences.defaultLocation,
          fetchNotifications: newPreferences.fetchNotifications
        }
      }))
      .catch((err) => console.log(err) && toast.error('Failed to update preferences'));
  }, [dispatch, preferences]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((values) => {
      preferencesSchema.validate(values, { abortEarly: true })
        .then((validatedValues) => {
          handleSaveRef.current(validatedValues);
        })
        .catch((error) => {
        });
    }, 500),
    []
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
    return () => {
      debouncedSave.flush();
    };
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  const addCaCertificate = (e) => {
    const filePath = window?.ipcRenderer?.getFilePath(e?.target?.files?.[0]);
    if (filePath) {
      formik.setFieldValue('customCaCertificate.filePath', filePath);
    }
  };

  const deleteCaCertificate = () => {
    formik.setFieldValue('customCaCertificate.filePath', null);
  };

  const browseDefaultLocation = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('defaultLocation', dirPath);
        }
      })
      .catch((error) => {
        // cancelling resolves false, so this is a real failure: keep the existing value
        console.error(error);
        toast.error('Failed to browse for a default location');
      });
  };

  const copyPathToClipboard = (value) => {
    navigator.clipboard
      .writeText(value)
      .then(() => toast.success('Copied'))
      .catch(() => toast.error('Failed to copy path'));
  };

  const revealPathInFolder = (pathname) => {
    dispatch(showInFolder(pathname)).catch(() => {
      toast.error('Error opening the folder');
    });
  };

  const customCaCertificateEnabled = formik.values.customCaCertificate.enabled;
  const customCaCertificatePath = formik.values.customCaCertificate.filePath;
  const keepDefaultCaCertificatesDisabled = !(customCaCertificateEnabled && customCaCertificatePath);
  const autoSaveEnabled = formik.values.autoSave.enabled;

  // Privacy: where collections live on this machine, deduped, in the order they were loaded.
  const openCollectionFolders = [];
  const seenCollectionPaths = new Set();
  collections.forEach((collection) => {
    if (!collection?.pathname || seenCollectionPaths.has(collection.pathname)) return;
    seenCollectionPaths.add(collection.pathname);
    openCollectionFolders.push({ name: collection.name, pathname: collection.pathname });
  });
  const aiEnabled = get(preferences, 'ai.enabled', false);

  // gate typed field errors on touched so they are not flashed on every keystroke
  const autoSaveIntervalTouched = get(formik.touched, 'autoSave.interval', false);
  const autoSaveError = autoSaveIntervalTouched ? formik.errors.autoSave?.interval : undefined;
  const timeoutError = formik.touched.timeout ? formik.errors.timeout : undefined;

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">General Settings</div>
      <form className="bruno-form settings-form" onSubmit={formik.handleSubmit}>
        <SettingsGroup title="Certificates">
          <CheckboxSetting
            id="sslVerification"
            name="sslVerification"
            label="SSL/TLS Certificate Verification"
            checked={formik.values.sslVerification}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="customCaCertificateEnabled"
            name="customCaCertificate.enabled"
            label="Use Custom CA Certificate"
            checked={customCaCertificateEnabled}
            onChange={formik.handleChange}
          >
            <div className={`ca-certificate-picker ${customCaCertificateEnabled ? '' : 'is-disabled'}`}>
              {customCaCertificatePath ? (
                <span className="ca-certificate-file">
                  {path.basename(customCaCertificatePath)}
                  <button
                    type="button"
                    className="ca-certificate-remove"
                    aria-label="Remove custom CA certificate"
                    data-testid="general-remove-ca-certificate"
                    disabled={!customCaCertificateEnabled}
                    onClick={deleteCaCertificate}
                  >
                    <IconTrash strokeWidth={1.5} size={14} />
                  </button>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    className="ca-certificate-select"
                    data-testid="general-select-ca-certificate"
                    disabled={!customCaCertificateEnabled}
                    onClick={() => inputFileCaCertificateRef.current.click()}
                  >
                    <IconUpload strokeWidth={1.5} size={14} aria-hidden="true" />
                    Select File
                  </button>
                  <input
                    id="caCertFilePath"
                    type="file"
                    name="customCaCertificate.filePath"
                    className="hidden"
                    ref={inputFileCaCertificateRef}
                    disabled={!customCaCertificateEnabled}
                    onChange={addCaCertificate}
                  />
                </>
              )}
            </div>
            <CheckboxSetting
              id="keepDefaultCaCertificatesEnabled"
              name="keepDefaultCaCertificates.enabled"
              label="Keep Default CA Certificates"
              checked={formik.values.keepDefaultCaCertificates.enabled}
              onChange={formik.handleChange}
              disabled={keepDefaultCaCertificatesDisabled}
            />
          </CheckboxSetting>
        </SettingsGroup>

        <SettingsGroup
          title="Privacy"
          description="RestLab keeps everything on your machine and sends nothing you did not start."
        >
          <CheckboxSetting
            id="fetchNotifications"
            name="fetchNotifications"
            label="Check for announcements"
            description="Contacts the Bruno announcements server on startup. Off by default: RestLab sends nothing unless you ask."
            data-testid="general-fetch-notifications"
            checked={formik.values.fetchNotifications}
            onChange={formik.handleChange}
          />

          <div className="privacy-data-lives" data-testid="privacy-data-lives">
            <div className="privacy-block-title">Where your data lives</div>
            <div className="privacy-path-row" data-testid="privacy-user-data-path">
              <div className="privacy-path-info">
                <span className="privacy-path-label">App data folder</span>
                <span className="privacy-path-hint">Preferences, global environments, sessions and other app data</span>
                <span className="privacy-path" title={userDataPath}>
                  {userDataPath || '…'}
                </span>
              </div>
              <div className="privacy-path-actions">
                <button
                  type="button"
                  className="privacy-path-action"
                  data-testid="privacy-copy-user-data"
                  disabled={!userDataPath}
                  onClick={() => copyPathToClipboard(userDataPath)}
                >
                  <IconCopy strokeWidth={1.5} size={14} aria-hidden="true" />
                  Copy
                </button>
                <button
                  type="button"
                  className="privacy-path-action"
                  data-testid="privacy-reveal-user-data"
                  disabled={!userDataPath}
                  onClick={() => revealPathInFolder(userDataPath)}
                >
                  {revealInFolderLabel}
                </button>
              </div>
            </div>
            {openCollectionFolders.length > 0 ? (
              openCollectionFolders.map((collection) => (
                <div className="privacy-path-row" data-testid="privacy-collection-path" key={collection.pathname}>
                  <div className="privacy-path-info">
                    <span className="privacy-path-label">{collection.name}</span>
                    <span className="privacy-path-hint">Collection</span>
                    <span className="privacy-path" title={collection.pathname}>
                      {collection.pathname}
                    </span>
                  </div>
                  <div className="privacy-path-actions">
                    <button
                      type="button"
                      className="privacy-path-action"
                      data-testid="privacy-copy-collection"
                      onClick={() => copyPathToClipboard(collection.pathname)}
                    >
                      <IconCopy strokeWidth={1.5} size={14} aria-hidden="true" />
                      Copy
                    </button>
                    <button
                      type="button"
                      className="privacy-path-action"
                      onClick={() => revealPathInFolder(collection.pathname)}
                    >
                      {revealInFolderLabel}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <span className="privacy-path-hint" data-testid="privacy-no-collections">
                No collections open
              </span>
            )}
          </div>

          <div className="privacy-connects" data-testid="privacy-connects">
            <div className="privacy-block-title">What can connect</div>
            <ul className="privacy-connect-list">
              <li>The requests you send, to the servers you enter.</li>
              <li>
                OAuth2 token requests, when you ask for a token: the reply is received by default on a
                loopback address of this machine, as documented in the inventory below.
              </li>
              <li data-testid="privacy-ai-state">
                AI providers, only while AI is turned on with your own key. Currently: {aiEnabled ? 'on' : 'off'}.
              </li>
            </ul>
            <p className="privacy-inventory-note" data-testid="privacy-inventory-note">
              {REPOSITORY_URL ? (
                <>
                  Complete list of every outbound connection:{' '}
                  <a href={`${REPOSITORY_URL}/blob/main/docs/privacy/network-inventory.md`}>network inventory</a>.
                </>
              ) : (
                <>
                  Complete list of every outbound connection: <code>docs/privacy/network-inventory.md</code> in the
                  RestLab repository.
                </>
              )}
            </p>
          </div>
        </SettingsGroup>

        <SettingsGroup title="Cookies & Authorization">
          <CheckboxSetting
            id="storeCookies"
            name="storeCookies"
            label="Store Cookies automatically"
            checked={formik.values.storeCookies}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="sendCookies"
            name="sendCookies"
            label="Send Cookies automatically"
            checked={formik.values.sendCookies}
            onChange={formik.handleChange}
          />
          <CheckboxSetting
            id="oauth2.useSystemBrowser"
            name="oauth2.useSystemBrowser"
            label="Use System Browser for OAuth2 Authorization"
            checked={formik.values.oauth2.useSystemBrowser}
            onChange={formik.handleChange}
          />
        </SettingsGroup>

        <SettingsGroup title="Auto Save">
          <CheckboxSetting
            id="autoSaveEnabled"
            name="autoSave.enabled"
            label="Enable Auto Save"
            checked={autoSaveEnabled}
            onChange={formik.handleChange}
          />
          <SettingsField
            label="Auto Save Delay (ms)"
            htmlFor="autoSaveInterval"
            disabled={!autoSaveEnabled}
            error={autoSaveError}
          >
            <input
              id="autoSaveInterval"
              type="text"
              name="autoSave.interval"
              className="textbox numeric-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.autoSave.interval}
              disabled={!autoSaveEnabled}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup title="Requests">
          <SettingsField label="Request Timeout (ms)" htmlFor="timeout" error={timeoutError}>
            <input
              id="timeout"
              type="text"
              name="timeout"
              className="textbox numeric-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              value={formik.values.timeout}
            />
          </SettingsField>
        </SettingsGroup>

        <SettingsGroup
          title="Default Location"
          description="Used as the default location for new workspaces and collections"
        >
          <SettingsField error={formik.errors.defaultLocation} className="default-location-field">
            <input
              type="text"
              name="defaultLocation"
              id="defaultLocation"
              aria-label="Default Location"
              data-testid="general-default-location-input"
              className="textbox cursor-pointer default-location-input"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              readOnly={true}
              onChange={formik.handleChange}
              value={formik.values.defaultLocation || ''}
              onClick={browseDefaultLocation}
              placeholder="Click to browse for default location"
            />
            <button
              type="button"
              className="default-location-browse"
              data-testid="general-browse-default-location"
              onClick={browseDefaultLocation}
            >
              Browse
            </button>
          </SettingsField>
        </SettingsGroup>
      </form>
    </StyledWrapper>
  );
};

export default General;
