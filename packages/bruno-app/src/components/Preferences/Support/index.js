import React from 'react';
import {
  IconSpeakerphone,
  IconBrandGithub,
  IconBook,
  IconExternalLink
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';
import { DOCS_URL, ISSUES_URL, REPOSITORY_URL } from 'utils/branding';

const SUPPORT_GROUPS = [
  {
    key: 'help',
    label: 'SUPPORT.HELP',
    links: [
      {
        key: 'documentation',
        icon: IconBook,
        url: DOCS_URL,
        label: 'COMMON.DOCUMENTATION',
        description: 'SUPPORT.DOCUMENTATION_DESCRIPTION'
      },
      {
        key: 'report-issues',
        icon: IconSpeakerphone,
        url: ISSUES_URL,
        label: 'COMMON.REPORT_ISSUES',
        description: 'SUPPORT.REPORT_ISSUES_DESCRIPTION'
      }
    ]
  },
  {
    key: 'community',
    label: 'SUPPORT.COMMUNITY',
    links: [
      {
        key: 'github',
        icon: IconBrandGithub,
        url: REPOSITORY_URL,
        label: 'COMMON.GITHUB',
        description: 'SUPPORT.GITHUB_DESCRIPTION'
      }
    ]
  }
];

const visibleGroups = SUPPORT_GROUPS
  .map((group) => ({ ...group, links: group.links.filter((link) => link.url) }))
  .filter((group) => group.links.length > 0);

const Support = () => {
  const { t } = useTranslation();

  return (
    <StyledWrapper className="w-full">
      <div className="section-header">Support</div>

      {visibleGroups.length === 0 && (
        <p className="support-empty" data-testid="support-empty">
          RestLab does not have its own documentation or issue tracker yet. Nothing here sends you to another project.
        </p>
      )}

      {visibleGroups.map((group) => (
        <section className="support-group" key={group.key} aria-labelledby={`support-${group.key}-label`}>
          <h3 className="support-group-label select-none" id={`support-${group.key}-label`}>
            {t(group.label)}
          </h3>
          <div className="support-card">
            {group.links.map(({ key, icon: Icon, url, label, description }) => (
              <a
                key={key}
                className="support-link"
                href={url}
                target="_blank"
                rel="noreferrer"
                aria-labelledby={`support-link-${key}-label`}
                aria-describedby={`support-link-${key}-description`}
                data-testid={`support-${key}`}
              >
                <span className="support-link-tile">
                  <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
                </span>
                <span className="support-link-text">
                  <span className="support-link-label" id={`support-link-${key}-label`}>
                    {t(label)}
                  </span>
                  <span className="support-link-description" id={`support-link-${key}-description`}>
                    {t(description)}
                  </span>
                </span>
                <IconExternalLink className="support-link-affordance" size={16} strokeWidth={1.5} aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>
      ))}
    </StyledWrapper>
  );
};

export default Support;
