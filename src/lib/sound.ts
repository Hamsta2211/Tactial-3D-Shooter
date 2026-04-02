export class SoundManager {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  playTone(freq: number, type: OscillatorType, duration: number, volume: number = 0.1) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playShoot() { this.playTone(440, 'square', 0.1, 0.05); }
  playReload() { 
    // Mechanical reload sound: click + slide
    this.playTone(150, 'square', 0.1, 0.1); 
    setTimeout(() => this.playTone(300, 'sawtooth', 0.3, 0.05), 150);
  }
  playEmptyAmmo() { this.playTone(100, 'square', 0.05, 0.05); }
  playEnemyShoot() { this.playTone(880, 'square', 0.05, 0.02); }
  playEnemyDie() { this.playTone(110, 'sine', 0.3, 0.1); }
  playPlayerDamage() { this.playTone(150, 'sawtooth', 0.2, 0.1); }
  playGameOver() { this.playTone(100, 'square', 1.0, 0.2); }
  playWaveStart() { this.playTone(880, 'sine', 0.5, 0.1); }
  playWaveClear() { 
    this.playTone(440, 'sine', 0.2, 0.1);
    setTimeout(() => this.playTone(660, 'sine', 0.2, 0.1), 100);
    setTimeout(() => this.playTone(880, 'sine', 0.4, 0.1), 200);
  }
  playMenuClick() { this.playTone(600, 'sine', 0.1, 0.05); }
  playExplosion() {
    this.playTone(60, 'sawtooth', 0.5, 0.2);
    this.playTone(100, 'square', 0.3, 0.1);
  }
}

export const soundManager = new SoundManager();
