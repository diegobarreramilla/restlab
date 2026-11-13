import { useDispatch, useSelector } from 'react-redux';
import { selectActiveTab } from 'src/selectors/tab';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { getCertificateErrorKind } from 'utils/certificate-errors';

const HINTS = {
  untrusted: 'This server\'s certificate is not signed by an authority RestLab trusts. If you trust the server, add its CA certificate under "Use Custom CA Certificate" in Preferences. Turning off "SSL/TLS Certificate Verification" there also works, but skips the check for every request.',
  validity: 'This server\'s certificate is expired or not valid yet. Check the date on this computer and the server\'s certificate. Turning off "SSL/TLS Certificate Verification" in Preferences skips the check for every request.',
  hostname: 'This server\'s certificate was issued for a different host name than the one in the URL. Use the host name on the certificate, or turn off "SSL/TLS Certificate Verification" in Preferences, which skips the check for every request.'
};

// Shown under a failed request when the cause is the server's certificate. It says what happened and opens
// Preferences, where the trust settings live, in one click.
const CertificateErrorHint = ({ error }) => {
  const dispatch = useDispatch();
  const activeTab = useSelector(selectActiveTab);
  const kind = getCertificateErrorKind(error);

  if (!kind) {
    return null;
  }

  const openPreferences = () => {
    const collectionUid = activeTab?.collectionUid;
    dispatch(
      addTab({
        type: 'preferences',
        uid: collectionUid ? `${collectionUid}-preferences` : 'preferences',
        collectionUid
      })
    );
  };

  return (
    <div className="mt-6 muted text-xs" data-testid="certificate-error-hint">
      <div>{HINTS[kind]}</div>
      <button type="button" className="mt-2 underline" onClick={openPreferences} data-testid="certificate-error-open-preferences">
        Open Preferences
      </button>
    </div>
  );
};

export default CertificateErrorHint;
