import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildBrandingArgs, buildPairTransitionArgs, buildUnifiedTransitionArgs } from "../src/renderer.mjs";
import { runProcess } from "../src/process-utils.mjs";

const enabled = process.env.STUDIO_INTEGRATION === "1";

test("composição usa uma única chamada FFmpeg para todas as transições", () => {
  const built = buildUnifiedTransitionArgs({
    segmentPaths: ["one.mp4", "two.mp4", "three.mp4"],
    scenes: [
      { duration: 3, transition: "none", transitionDuration: 0 },
      { duration: 3, transition: "fade", transitionDuration: 0.4 },
      { duration: 3, transition: "hardcut", transitionDuration: 0.4 }
    ],
    outputPath: "result.mp4", width: 1080, height: 1920, exportOptions: { fps: 30, quality: "balanced" }
  });
  assert.equal(built.args.filter((item) => item === "-filter_complex").length, 1);
  assert.equal(built.args.filter((item) => item === "-i").length, 3);
  assert.match(built.args[built.args.indexOf("-filter_complex") + 1], /vchain1.*vout/);
  assert.ok(built.args.includes("veryfast"));
});

test("acabamento ajusta imagem e áudio exatamente à duração selecionada", () => {
  const args = buildBrandingArgs({
    inputPath: "composition.mp4",
    outputPath: "final.mp4",
    duration: 30,
    format: "9:16",
    plan: { textLayers: [], audio: {}, export: { fps: 30, quality: "balanced" } }
  });
  const graph = args[args.indexOf("-filter_complex") + 1];
  assert.match(graph, /tpad=stop_mode=clone:stop_duration=30\.000,trim=duration=30\.000/);
  assert.match(graph, /apad=pad_dur=30\.000,atrim=duration=30\.000/);
  assert.equal(args[args.indexOf("-t") + 1], "30.000");
});

test("acabamento completa uma composição curta até a duração escolhida", { skip: !enabled, timeout: 120000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-duration-fit-"));
  try {
    const base = path.join(root, "short.mp4");
    const output = path.join(root, "fitted.mp4");
    await makeClip(base, "0x092B45");
    await runProcess("ffmpeg", buildBrandingArgs({ inputPath: base, outputPath: output, duration: 3, format: "9:16", renderProfile: "preview", plan: { textLayers: [], audio: {}, export: { fps: 30, quality: "compact" } } }));
    const { stdout } = await runProcess("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "json", output]);
    const duration = Number(JSON.parse(stdout).format.duration);
    assert.ok(duration >= 2.9 && duration <= 3.1, `duração obtida: ${duration}`);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

async function makeClip(target, color) {
  await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", `color=c=${color}:s=320x320:r=30:d=1.4`, "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-t", "1.4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", target]);
}

test("Fase 1 exporta transições, textos animados e logo em MP4 real", { skip: !enabled, timeout: 240000 }, async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ola-studio-phase1-"));
  try {
    const left = path.join(root, "left.mp4");
    const right = path.join(root, "right.mp4");
    await makeClip(left, "0x092B45");
    await makeClip(right, "0xFFBB2D");
    const unifiedOutput = path.join(root, "transition-unified.mp4");
    const unified = buildUnifiedTransitionArgs({ segmentPaths: [left, right], scenes: [{ duration: 1.4, transition: "none", transitionDuration: 0 }, { duration: 1.4, transition: "fade", transitionDuration: 0.3 }], outputPath: unifiedOutput, width: 320, height: 320, exportOptions: { fps: 30, quality: "compact" } });
    await runProcess("ffmpeg", unified.args);
    assert.ok((await fs.stat(unifiedOutput)).size > 1000);
    for (const transition of ["fade", "dissolve", "zoomin", "zoomout", "slideleft", "wipeleft", "hblur", "smoothleft", "fadewhite", "circleopen", "hardcut", "fadeblack"]) {
      const output = path.join(root, `transition-${transition}.mp4`);
      const built = buildPairTransitionArgs({ leftPath: left, rightPath: right, outputPath: output, leftDuration: 1.4, rightDuration: 1.4, transition, transitionDuration: 0.3, width: 320, height: 320 });
      await runProcess("ffmpeg", built.args);
      assert.ok((await fs.stat(output)).size > 1000, transition);
    }

    const base = path.join(root, "vertical-base.mp4");
    const logo = path.join(root, "logo.png");
    const final = path.join(root, "studio-pro-phase1.mp4");
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0x123B59:s=1080x1920:r=30:d=4", "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000", "-t", "4", "-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", base]);
    await runProcess("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=0xFFBB2D:s=320x140", "-frames:v", "1", "-threads", "1", logo]);
    const plan = {
      textDesign: { font: "sans", color: "#FFFFFF", outlineColor: "#092B45", background: true, align: "center", margin: 64 },
      textLayers: [
        { value: "Olá Studio Pro", start: 0.1, end: 2.2, animation: "slide_up", position: "top", sizeScale: 1.35 },
        { value: "Vídeo profissional em português", start: 0.5, end: 3, animation: "word_by_word", position: "center", sizeScale: 0.8 },
        { value: "Conheça agora", start: 2.2, end: 3.9, animation: "zoom_pop", position: "bottom", sizeScale: 1 }
      ],
      logo: { enabled: true, start: 2.6, end: 3.9, size: 0.22 },
      music: { enabled: false }
    };
    await runProcess("ffmpeg", buildBrandingArgs({ inputPath: base, outputPath: final, duration: 4, format: "9:16", plan, logoPath: logo }));
    const { stdout } = await runProcess("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", final]);
    const metadata = JSON.parse(stdout);
    assert.equal(metadata.streams[0].width, 1080);
    assert.equal(metadata.streams[0].height, 1920);
    assert.ok(Number(metadata.format.duration) >= 3.9 && Number(metadata.format.duration) <= 4.1);
    assert.ok((await fs.stat(final)).size > 10000);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
