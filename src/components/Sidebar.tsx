import { Meeting } from '../types/electron';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2 } from 'lucide-react';

interface SidebarProps {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  onSelectMeeting: (meeting: Meeting) => void;
  onNewMeeting: () => void;
  onDeleteMeeting: (meetingId: number) => void;
}

function Sidebar({ meetings, currentMeeting, onSelectMeeting, onNewMeeting, onDeleteMeeting }: SidebarProps) {
  const { t, i18n } = useTranslation();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <h2>{t('sidebar.title')}</h2>
          <button className="new-meeting-button" onClick={onNewMeeting} title={t('sidebar.new_meeting')}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="meetings-list">
        {meetings.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#8b949e' }}>
            {t('sidebar.no_meetings')}
          </div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className={`meeting-item ${currentMeeting?.id === meeting.id ? 'active' : ''}`}
            >
              <div className="meeting-item-content" onClick={() => onSelectMeeting(meeting)}>
                <div className="meeting-name">{meeting.name}</div>
                <div className="meeting-date">{formatDate(meeting.created_at)}</div>
              </div>
              <button
                className="delete-meeting-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(t('sidebar.delete_confirm', { name: meeting.name }))) {
                    onDeleteMeeting(meeting.id);
                  }
                }}
                title={t('sidebar.delete')}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(Sidebar);
