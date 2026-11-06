import { beforeEach, describe, expect, it } from 'vitest';

import { clipVoiceId } from '../clip-voice';
import { pickClipVoiceId, pickSpeaker } from '../engine';
import { useTtsStore } from '../store';

const LADA = 'piper-uk-lada';
const MEDIUM = 'piper-uk-ukrainian-tts';

/** T85 on Ukrainian voices (UP07): the clip voice and the speaker it speaks with. */
describe('T85 Piper word clips (uk voices)', () => {
  it('pickClipVoiceId returns the selected medium voice when installed', () => {
    expect(pickClipVoiceId(MEDIUM, [LADA, MEDIUM])).toBe(MEDIUM);
  });

  describe('clipVoiceId reads the live store', () => {
    beforeEach(() => {
      useTtsStore.setState({
        selectedVoiceId: MEDIUM,
        selectedSid: 2,
        installed: {
          [MEDIUM]: { installedAt: 1 } as never,
          [LADA]: { installedAt: 1 } as never,
        },
      });
    });

    it('picks the selected multi-speaker voice and the clip then speaks the selected sid', () => {
      const voiceId = clipVoiceId();
      expect(voiceId).toBe(MEDIUM);
      const { selectedVoiceId, selectedSid } = useTtsStore.getState();
      // service.speakWithInfo resolves the sid through pickSpeaker with no explicit request
      expect(pickSpeaker(voiceId!, undefined, selectedVoiceId, selectedSid)).toBe(2);
    });

    it('a different clip voice never inherits the medium voice sid', () => {
      useTtsStore.setState({ installed: { [LADA]: { installedAt: 1 } as never } });
      const voiceId = clipVoiceId();
      expect(voiceId).toBe(LADA);
      expect(pickSpeaker(voiceId!, undefined, MEDIUM, 2)).toBe(0);
    });
  });
});
