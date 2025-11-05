import test from "node:test";
import assert from "node:assert";
import { AudioManagerCore, type VolumeController } from "@/components/AudioManager";

test("AudioManager ducks secondary streams", () => {
  const manager = new AudioManagerCore(0.2);
  const controllerA = createMockController();
  const controllerB = createMockController();

  manager.register({ id: "stream-a", controller: controllerA });
  manager.register({ id: "stream-b", controller: controllerB });

  assert.equal(controllerA.volume, 100, "Primary stream should be full volume");
  assert.equal(controllerB.volume, 20, "Secondary stream should be ducked to 20%");

  manager.setPrimary("stream-b");

  assert.equal(controllerA.volume, 20, "Original stream should now be ducked");
  assert.equal(controllerB.volume, 100, "New primary should be full volume");

  manager.unregister("stream-b");
  assert.equal(manager.getPrimary(), "stream-a");
});

function createMockController(): VolumeController & { volume: number } {
  return {
    volume: 0,
    setVolume(volume: number) {
      this.volume = Math.round(volume);
    },
    getVolume() {
      return this.volume;
    },
  } as VolumeController & { volume: number };
}
