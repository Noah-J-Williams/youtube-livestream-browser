"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

const DEFAULT_DUCK_VOLUME = 0.18;
const FADE_STEP = 0.08;

export type VolumeController = {
  setVolume: (volume: number) => void;
  getVolume?: () => number;
};

export type ManagedAudio = {
  id: string;
  element?: HTMLMediaElement | null;
  controller?: VolumeController;
};

type InternalStream = {
  id: string;
  element?: HTMLMediaElement | null;
  controller?: VolumeController;
  gainNode?: GainNode;
  targetVolume: number;
  currentVolume: number;
};

export class AudioManagerCore {
  private audioContext: AudioContext | null = null;
  private streams = new Map<string, InternalStream>();
  private primaryId: string | null = null;
  private animationFrame?: number;

  constructor(private duckVolume = DEFAULT_DUCK_VOLUME) {}

  register(stream: ManagedAudio) {
    const existing = this.streams.get(stream.id);
    if (existing) {
      existing.element = stream.element ?? existing.element;
      return existing.id;
    }

    const record: InternalStream = {
      id: stream.id,
      element: stream.element,
      controller: stream.controller,
      targetVolume: stream.id === this.primaryId ? 1 : this.duckVolume,
      currentVolume: stream.controller?.getVolume?.() ?? 0,
    };

    this.streams.set(stream.id, record);
    this.ensureAudioGraph(record);
    this.applyImmediateVolume(record);
    this.scheduleUpdate();
    if (!this.primaryId) {
      this.setPrimary(stream.id);
    }
    return stream.id;
  }

  unregister(id: string) {
    const record = this.streams.get(id);
    if (!record) return;
    record.gainNode?.disconnect();
    this.streams.delete(id);
    if (this.primaryId === id) {
      this.primaryId = this.streams.keys().next().value ?? null;
      if (this.primaryId) {
        this.setPrimary(this.primaryId);
      }
    }
  }

  setPrimary(id: string) {
    if (!this.streams.has(id)) {
      this.primaryId = id;
      return;
    }
    this.primaryId = id;
    for (const stream of this.streams.values()) {
      stream.targetVolume = stream.id === id ? 1 : this.duckVolume;
    }
    if (typeof window === "undefined") {
      for (const stream of this.streams.values()) {
        this.applyImmediateVolume(stream);
      }
      return;
    }
    this.scheduleUpdate();
  }

  getPrimary() {
    return this.primaryId;
  }

  cyclePrimary() {
    const ids = Array.from(this.streams.keys());
    if (ids.length === 0) return null;
    if (!this.primaryId) {
      this.setPrimary(ids[0]);
      return ids[0];
    }
    const index = ids.indexOf(this.primaryId);
    const nextId = ids[(index + 1) % ids.length];
    this.setPrimary(nextId);
    return nextId;
  }

  private ensureAudioGraph(stream: InternalStream) {
    if (typeof window === "undefined") return;
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (!stream.element || stream.gainNode) return;

    const source = this.audioContext.createMediaElementSource(stream.element);
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = stream.targetVolume;
    source.connect(gainNode).connect(this.audioContext.destination);
    stream.gainNode = gainNode;
  }

  private applyImmediateVolume(stream: InternalStream) {
    if (stream.controller) {
      stream.controller.setVolume(stream.targetVolume * 100);
      stream.currentVolume = stream.targetVolume;
    } else if (stream.gainNode) {
      stream.gainNode.gain.value = stream.targetVolume;
    } else if (stream.element) {
      stream.element.volume = stream.targetVolume;
    }
  }

  private scheduleUpdate() {
    if (typeof window === "undefined") return;
    if (this.animationFrame) return;
    const tick = () => {
      this.animationFrame = undefined;
      this.animateVolumes();
      if (this.streams.size > 0) {
        this.animationFrame = requestAnimationFrame(tick);
      }
    };
    this.animationFrame = requestAnimationFrame(tick);
  }

  private animateVolumes() {
    if (!this.audioContext) return;
    for (const stream of this.streams.values()) {
      const current = stream.controller
        ? stream.currentVolume
        : stream.gainNode
          ? stream.gainNode.gain.value
          : stream.element?.volume ?? stream.currentVolume;
      if (Math.abs(current - stream.targetVolume) < 0.01) {
        if (stream.controller) {
          stream.controller.setVolume(stream.targetVolume * 100);
          stream.currentVolume = stream.targetVolume;
        } else if (stream.gainNode) {
          stream.gainNode.gain.value = stream.targetVolume;
        } else if (stream.element) {
          stream.element.volume = stream.targetVolume;
        }
        continue;
      }
      const direction = stream.targetVolume > current ? 1 : -1;
      const nextValue = current + direction * FADE_STEP;
      const clamped = Math.min(1, Math.max(this.duckVolume, nextValue));
      if (stream.controller) {
        stream.controller.setVolume(clamped * 100);
        stream.currentVolume = clamped;
      } else if (stream.gainNode) {
        stream.gainNode.gain.value = clamped;
      } else if (stream.element) {
        stream.element.volume = clamped;
      }
    }
  }
}

type AudioManagerContextValue = {
  manager: AudioManagerCore;
  primaryId: string | null;
  setPrimary: (id: string) => void;
};

const AudioManagerContext = createContext<AudioManagerContextValue | null>(null);

export function AudioManagerProvider({ children }: { children: ReactNode }) {
  const manager = useMemo(() => new AudioManagerCore(), []);
  const [primaryId, setPrimaryId] = useState<string | null>(null);

  useEffect(() => {
    setPrimaryId(manager.getPrimary());
  }, [manager]);

  const value = useMemo<AudioManagerContextValue>(
    () => ({
      manager,
      primaryId,
      setPrimary: (id: string) => {
        manager.setPrimary(id);
        setPrimaryId(id);
      },
    }),
    [manager, primaryId]
  );

  return <AudioManagerContext.Provider value={value}>{children}</AudioManagerContext.Provider>;
}

export function useAudioManager() {
  const context = useContext(AudioManagerContext);
  if (!context) {
    throw new Error("useAudioManager must be used within an AudioManagerProvider");
  }
  return context;
}

type ManagedAudioOptions = {
  element?: HTMLMediaElement | null;
  controller?: VolumeController | null;
};

export function useManagedAudio(id: string, options?: ManagedAudioOptions) {
  const { manager, setPrimary, primaryId } = useAudioManager();
  const elementRef = useRef<HTMLMediaElement | null | undefined>(options?.element);
  const controllerRef = useRef<VolumeController | null | undefined>(options?.controller ?? undefined);

  useEffect(() => {
    elementRef.current = options?.element ?? elementRef.current;
    controllerRef.current = options?.controller ?? controllerRef.current;
    manager.register({ id, element: elementRef.current ?? undefined, controller: controllerRef.current ?? undefined });
    return () => {
      manager.unregister(id);
    };
  }, [manager, id, options?.element, options?.controller]);

  const makePrimary = () => setPrimary(id);

  return {
    isPrimary: primaryId === id,
    makePrimary,
  };
}
