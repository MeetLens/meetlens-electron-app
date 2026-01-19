import { Meeting } from '../types/electron';
import { memo } from 'react';

interface SidebarProps {
  meetings: Meeting[];
  currentMeeting: Meeting | null;
  onSelectMeeting: (meeting: Meeting) => void;
  onNewMeeting: () => void;
  onDeleteMeeting: (meetingId: number) => void;
}

function Sidebar({ meetings, currentMeeting, onSelectMeeting, onNewMeeting, onDeleteMeeting }: SidebarProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
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
          <h2>Your Spaces</h2>
          <button className="new-meeting-button" onClick={onNewMeeting} title="New Meeting">
            +
          </button>
        </div>
      </div>

      <div className="meetings-list">
        {meetings.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#8b949e' }}>
            No meetings yet. Click + to create one.
          </div>
        ) : (
          meetings.map((meeting) => (
            <div
              key={meeting.id}
              className={`meeting-item ${currentMeeting?.id === meeting.id ? 'active' : ''}`}
              style={{ position: 'relative' }}
            >
              <div onClick={() => onSelectMeeting(meeting)} style={{ flex: 1 }}>
                <div className="meeting-name">{meeting.name}</div>
                <div className="meeting-date">{formatDate(meeting.created_at)}</div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${meeting.name}"?`)) {
                    onDeleteMeeting(meeting.id);
                  }
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(239, 65, 70, 0.1)',
                  border: '1px solid rgba(239, 65, 70, 0.3)',
                  color: '#ef4146',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  opacity: 0,
                  transition: 'opacity 0.2s',
                }}
                className="delete-meeting-btn"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(Sidebar);
