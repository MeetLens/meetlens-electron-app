import { useEffect, useRef, useState, useCallback, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  VariableSizeList,
  type ListChildComponentProps,
} from 'react-window';
import { Mic, Trash2 } from 'lucide-react';
import type { TranscriptEntry } from '../types/transcript';

const ESTIMATED_ITEM_HEIGHT = 96;
const ITEM_SPACING = 16;

interface TranscriptPanelProps {
  transcripts: TranscriptEntry[];
  onClear: () => void;
  isRecording: boolean;
}

interface TranscriptItemData {
  transcripts: TranscriptEntry[];
  setItemSize: (index: number, key: string, size: number) => void;
}

function TranscriptRow({ index, style, data }: ListChildComponentProps<TranscriptItemData>) {
  const entry = data.transcripts[index];
  const entryKey = entry.id;
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!rowRef.current) {
      return;
    }
    const height = rowRef.current.getBoundingClientRect().height;
    data.setItemSize(index, entryKey, height);
  }, [data, index, entryKey, entry.text, entry.timestamp, entry.translation]);

  return (
    <div style={style}>
      <div ref={rowRef} style={{ paddingBottom: ITEM_SPACING, width: '100%' }}>
        <div className="transcript-entry transcript-entry--virtualized">
          <div className="transcript-timestamp">{entry.timestamp}</div>
          <div className="transcript-text">{entry.text}</div>
        </div>
      </div>
    </div>
  );
}

function TranscriptPanel({ transcripts, onClear, isRecording }: TranscriptPanelProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList<TranscriptItemData> | null>(null);
  const listOuterRef = useRef<HTMLDivElement | null>(null);
  const sizeMap = useRef(new Map<string, number>());
  const previousKeysRef = useRef<string[]>([]);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const setItemSize = useCallback((index: number, key: string, size: number) => {
    const currentSize = sizeMap.current.get(key);
    if (currentSize !== size) {
      sizeMap.current.set(key, size);
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  const getItemSize = useCallback(
    (index: number) => {
      const entry = transcripts[index];
      if (!entry) {
        return ESTIMATED_ITEM_HEIGHT;
      }
      return sizeMap.current.get(entry.id) ?? ESTIMATED_ITEM_HEIGHT;
    },
    [transcripts]
  );

  const getItemKey = useCallback(
    (index: number, data: TranscriptItemData) => data.transcripts[index].id,
    []
  );

  const itemData = useMemo(
    () => ({
      transcripts,
      setItemSize,
    }),
    [transcripts, setItemSize]
  );

  useEffect(() => {
    const nextKeys = transcripts.map((entry) => entry.id);
    const previousKeys = previousKeysRef.current;
    let orderChanged = nextKeys.length !== previousKeys.length;

    if (!orderChanged) {
      for (let i = 0; i < nextKeys.length; i += 1) {
        if (nextKeys[i] !== previousKeys[i]) {
          orderChanged = true;
          break;
        }
      }
    }

    if (orderChanged) {
      listRef.current?.resetAfterIndex(0, true);
    }

    const allowedKeys = new Set(nextKeys);
    sizeMap.current.forEach((_size, key) => {
      if (!allowedKeys.has(key)) {
        sizeMap.current.delete(key);
      }
    });

    previousKeysRef.current = nextKeys;
  }, [transcripts]);

  useEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const element = containerRef.current;
    const updateSize = (width: number, height: number) => {
      setContainerSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    const initialRect = element.getBoundingClientRect();
    updateSize(initialRect.width, initialRect.height);

    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        updateSize(width, height);
      });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Check if user is near bottom of scroll container
  const checkNearBottom = useCallback(() => {
    if (!listOuterRef.current) return true;

    const container = listOuterRef.current;
    const threshold = 100; // pixels from bottom to consider "near bottom"
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= threshold;
  }, []);

  // Handle scroll events to track user interaction
  const handleScroll = useCallback(() => {
    const nearBottom = checkNearBottom();

    // If user scrolls to bottom, re-enable auto-scroll
    if (nearBottom && !isAutoScrollEnabled) {
      setIsAutoScrollEnabled(true);
    }
    // If user scrolls away from bottom, disable auto-scroll
    else if (!nearBottom && isAutoScrollEnabled) {
      setIsAutoScrollEnabled(false);
    }
  }, [checkNearBottom, isAutoScrollEnabled]);

  // Smart auto-scroll: only scroll if auto-scroll is enabled and we're recording
  useEffect(() => {
    if (isRecording && isAutoScrollEnabled && transcripts.length > 0) {
      listRef.current?.scrollToItem(transcripts.length - 1, 'end');
    }
  }, [containerSize.height, isAutoScrollEnabled, isRecording, transcripts.length]);

  return (
    <div className="center-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2 className="panel-title">{t('transcript.title')}</h2>
          {isRecording && !isAutoScrollEnabled && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                color: '#666',
                backgroundColor: '#f5f5f5',
                padding: '2px 6px',
                borderRadius: '10px',
                border: '1px solid #e0e0e0'
              }}
              title={t('transcript.scroll_paused_title')}
            >
              <div
                style={{
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#ff6b35',
                  borderRadius: '50%',
                  animation: 'pulse 2s ease-in-out infinite'
                }}
              />
              <span>{t('transcript.scroll_paused')}</span>
            </div>
          )}
        </div>
        <button className="clear-button clear-button--icon" onClick={onClear} title={t('transcript.clear')}>
          <Trash2 size={16} />
        </button>
      </div>

      <div
        ref={containerRef}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        {transcripts.length === 0 ? (
          <div className="transcript-container">
            <div className="empty-state">
              <div className="empty-icon"><Mic size={48} /></div>
              <div className="empty-text">
                {isRecording
                  ? t('transcript.empty_listening')
                  : t('transcript.empty_start')}
              </div>
            </div>
          </div>
        ) : (
          containerSize.height > 0 &&
          containerSize.width > 0 && (
            <VariableSizeList
              ref={listRef}
              outerRef={listOuterRef}
              className="transcript-container"
              height={containerSize.height}
              width={containerSize.width}
              itemCount={transcripts.length}
              itemSize={getItemSize}
              itemData={itemData}
              itemKey={getItemKey}
              onScroll={handleScroll}
              overscanCount={6}
            >
              {TranscriptRow}
            </VariableSizeList>
          )
        )}
      </div>
    </div>
  );
}

export default TranscriptPanel;
