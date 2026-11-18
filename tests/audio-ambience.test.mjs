import assert from 'node:assert/strict';

const param = () => ({
  value: 0,
  setTargetAtTime() {},
  setValueAtTime() {},
  linearRampToValueAtTime() {},
  exponentialRampToValueAtTime() {},
  cancelScheduledValues() {},
});

class FakeNode {
  connect(next) { return next; }
  start() {}
  stop() {}
}
class FakeAudioContext {
  constructor() {
    this.sampleRate = 8000;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = new FakeNode();
    this.filters = [];
    globalThis.__audioMock = this;
  }
  createGain() { return Object.assign(new FakeNode(), { gain: param() }); }
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { getChannelData: index => data[index] };
  }
  createBufferSource() { return Object.assign(new FakeNode(), { buffer: null, loop: false }); }
  createBiquadFilter() {
    const f = Object.assign(new FakeNode(), { frequency: param(), Q: param(), type: 'lowpass' });
    this.filters.push(f);
    return f;
  }
  createOscillator() { return Object.assign(new FakeNode(), { frequency: param(), type: 'sine' }); }
  suspend() { this.state = 'suspended'; }
  resume() { this.state = 'running'; }
}
globalThis.window = { AudioContext: FakeAudioContext };
const Audio = await import('../public/js/audio.js');

Audio.audioInit();
assert.equal(globalThis.__audioMock.filters.length, 3, 'l ambiance doit avoir trois bandes fréquentielles');
Audio.crowd(0.7);
Audio.crowd(2); // intensité bornée à 1
Audio.crowd(-1); // intensité bornée à 0
Audio.kick(0.6);
Audio.whistle(true);
Audio.netSound();
Audio.saveSound();
Audio.impact(0.8);
Audio.roar();
Audio.stopDrums();
Audio.audioSuspend();
Audio.audioResume();
Audio.setAudio(false, 0.4);
Audio.setAudio(true, 0.6);
assert.equal(globalThis.__audioMock.state, 'running', 'l audio reprend après la suspension');
console.log('AUDIO AMBIENCE OK — trois bandes, dynamique de foule et effets synthétisés');
