import { SUMMARY_ENDPOINT_URL } from '../config';

// Backend API service for meeting summaries
export interface SummaryResponse {
  summary: {
    short_overview: string;
    action_items: string[];
    decisions: string[];
  };
}

export interface SummaryRequest {
  session_id: string;
  full_transcript: string;
  language: string | null;
}

export class BackendSummaryService {
  private apiUrl = SUMMARY_ENDPOINT_URL;

  async generateSummary(
    sessionId: string,
    transcript: string,
    language: string | null = null
  ): Promise<SummaryResponse> {
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('Insufficient content: Transcript is empty or too short');
    }

    try {
      const requestBody: SummaryRequest = {
        session_id: sessionId,
        full_transcript: transcript,
        language: language,
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend API error: ${response.status} - ${errorText}`);
      }

      const data: SummaryResponse = await response.json();

      // Validate response structure
      if (!data.summary || !data.summary.short_overview) {
        throw new Error('Invalid response format from backend');
      }

      return data;
    } catch (error) {
      console.error('Error generating summary from backend:', error);
      throw error;
    }
  }

  // Helper to format the structured summary for display
  formatSummaryForDisplay(summaryResponse: SummaryResponse): string {
    const { short_overview, action_items, decisions } = summaryResponse.summary;

    let formatted = `${short_overview}\n\n`;

    if (action_items && action_items.length > 0) {
      formatted += '**Action Items:**\n';
      action_items.forEach(item => {
        formatted += `• ${item}\n`;
      });
      formatted += '\n';
    }

    if (decisions && decisions.length > 0) {
      formatted += '**Decisions:**\n';
      decisions.forEach(decision => {
        formatted += `• ${decision}\n`;
      });
    }

    return formatted.trim();
  }
}
