import React from 'react';
import { getDisplayName, getInitials } from './announcementUtils';

/**
 * @param {object} props
 * @param {object} [props.person] - Person object with name and avatar fields.
 * @param {string} [props.sizeClassName] - Tailwind size classes for the avatar shell.
 * @param {string} [props.textClassName] - Tailwind text classes for initials fallback.
 */
const AnnouncementAvatar = ({
  person,
  sizeClassName = 'h-11 w-11',
  textClassName = 'text-sm',
}) => {
  if (person?.profilePicture) {
    return (
      <img
        src={person.profilePicture}
        alt={getDisplayName(person)}
        className={`${sizeClassName} rounded-full border border-slate-200 object-cover shadow-sm`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} flex items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-600 shadow-sm ${textClassName}`}
      aria-hidden="true"
    >
      {getInitials(person)}
    </div>
  );
};

export default AnnouncementAvatar;
