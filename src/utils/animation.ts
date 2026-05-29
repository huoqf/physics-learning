type AnimationCallback = (deltaTime: number) => void;

interface AnimationController {
  start: (callback: AnimationCallback) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  isPlaying: () => boolean;
}

class AnimationControllerImpl implements AnimationController {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private callback: AnimationCallback | null = null;
  private speed: number = 1;
  private playing: boolean = false;

  private loop = (currentTime: number) => {
    if (!this.playing || !this.callback) return;

    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    const deltaTime = (currentTime - this.lastTime) * this.speed;
    this.lastTime = currentTime;

    this.callback(deltaTime);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  start(callback: AnimationCallback) {
    this.callback = callback;
    this.playing = true;
    this.lastTime = 0;
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  pause() {
    this.playing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  resume() {
    if (!this.playing && this.callback) {
      this.playing = true;
      this.lastTime = 0;
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  reset() {
    this.pause();
    this.lastTime = 0;
    if (this.callback) {
      this.start(this.callback);
    }
  }

  setSpeed(speed: number) {
    this.speed = Math.max(0.1, Math.min(speed, 10));
  }

  isPlaying(): boolean {
    return this.playing;
  }
}

export const globalAnimationController = new AnimationControllerImpl();
