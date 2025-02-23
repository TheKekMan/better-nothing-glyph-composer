// ffmpegService.ts

import { kMajorVersion } from "@/lib/consts";
import dataStore, { PhoneSpecificInfo } from "@/lib/data_store";
import { getDateTime } from "@/lib/helpers";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import fileDownload from "js-file-download";

class FFmpegService {
  private static instance: FFmpegService;
  private ffmpeg: FFmpeg;
  private progressPercentage: number;

  private constructor() {
    this.ffmpeg = new FFmpeg();
    this.progressPercentage = 0;
    this.ffmpeg.on("progress", (progress) => {
      this.progressPercentage = parseInt((progress.progress * 100).toFixed(0));

      if (this.progressPercentage > 99.4) {
        this.progressPercentage = 0;
      }

      console.log(
        `Saving file: ${this.progressPercentage}% done, please wait...`
      );
    });
  }

  static getInstance(): FFmpegService {
    if (!FFmpegService.instance) {
      FFmpegService.instance = new FFmpegService();
    }
    return FFmpegService.instance;
  }

  async load(): Promise<void> {
    // console.info(`-+~ Starting to FFMPEG LOADED `);

    // Hosting did not support files more than 25mb, the local file in public/ is over 32mb sadge :(
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";

    await this.ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, `text/javascript`),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        `application/wasm`
      ),
    });
    // console.info(`Success! FFMPEG LOADED -+~`);
  }

  async saveOutput(
    inputAudioFile: File,
    processedGlyphData: string,
    currentDevice: string
  ): Promise<void> {
    await this.ffmpeg.writeFile(`input.ogg`, await fetchFile(inputAudioFile));
    // console.log("Initiating Save Process");

    // default to NP1 on error
    const phoneInfo: PhoneSpecificInfo =
      dataStore.get(currentDevice) ??
      <PhoneSpecificInfo>{
        composer: `v1-Spacewar Glyph Composer`,
        album: `BNGC v${kMajorVersion}`,
        custom2: "5cols",
        custom1: `eNoljVsKAEEIwy60A+r4qPe/2E7pj8FAiZ340vvYh8S7HjBiPB7ivUQ1ZexS3owkUJxlDGWOUZZfyqrmrs24awVahVFhVIAKUAEqrAqrwg8LSR98`,
      };
    const composer = phoneInfo.composer;

    const album = phoneInfo.album;
    const custom1 = phoneInfo.custom1;
    const custom2 = phoneInfo.custom2;

    const outputFileName = `glyph_tone_${getDateTime()}.ogg`;

    await this.ffmpeg.exec([
      `-i`,
      `input.ogg`,
      `-strict`,
      `-2`,
      `-metadata`,
      `AUTHOR=${processedGlyphData}`,
      `-metadata`,
      `TITLE=output_${Date.now()}`,
      `-metadata`,
      `COMPOSER=${composer}`,
      `-metadata`,
      `ALBUM=${album}`,
      `-metadata`,
      `CUSTOM1=${custom1}`,
      `-metadata`,
      `CUSTOM2=${custom2}`,
      `-c:a`,
      `opus`,
      `-vn`,
      `-map_metadata`,
      `0:s:a:0`,
      `${outputFileName}`,
    ]);

    const outputFile = await this.ffmpeg.readFile(`${outputFileName}`);

    fileDownload(outputFile, outputFileName);
  }

  getFFmpegInstance(): FFmpeg {
    return this.ffmpeg;
  }
  getSaveProgress(): number {
    return this.progressPercentage;
  }
}

export default FFmpegService.getInstance();
