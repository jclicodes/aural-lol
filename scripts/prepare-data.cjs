#!/usr/bin/env node
const axios = require("axios");
const ffmpeg = require('fluent-ffmpeg');

const path = require("path");
const fs = require("fs");

// Filepaths
const root = path.resolve(__dirname, '..');
const downloadPath = path.resolve(root, 'website/files');

// Resource URLs
const abilitySfxUrl = "https://d28xe8vt774jo5.cloudfront.net";
const baseUrl = "https://raw.communitydragon.org/json/latest/plugins/rcp-be-lol-game-data/global/default/v1";
const championsJsonUrl = `${baseUrl}/champions`;
const pickSfxUrl = `${baseUrl}/champion-choose-vo`;
const banSfxUrl = `${baseUrl}/champion-ban-vo`;

const excludeIds = ["-1", "523", "112"];

const downloadBinary = async (url, filepath) => {
  try {
    const response = await axios.get(url, {
      responseType: 'stream',
    })

    const filetype = path.extname(filepath);
    return new Promise((resolve, reject) => {
      if (filetype === '.webm') {
        const outputPath = filepath.replace('.webm', '.ogg');
        ffmpeg(response.data)
          .noVideo()
          .audioCodec('libvorbis')
          .save(outputPath)
          .on('end', resolve)
          .on('error', reject);
      } else {
        const writer = fs.createWriteStream(filepath);
        response.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      }
    });
  } catch (error) {
    console.error(`Error downloading ${url}: ${error}`);
    throw error;
  }
}

const getChampionData = async (url) => {
  try {
    const response = await axios.get(url, {
      responseType: 'json',
    });

    const parsed = response.data;

    return {
      name: parsed.name,
      spells: parsed.spells.map(({ spellKey, abilityVideoPath }) => ({ spellKey, abilityVideoPath })),
    }
  } catch (error) {
    console.error(`Error downloading JSON from ${url}: ${error.message}`);
    throw error;
  }
};

const getChampionDataIndex = async () => {
  try {
    console.log('Fetching champion data index...')
    const allChampions = await axios.get(championsJsonUrl, {
      responseType: 'json',
    });

    return allChampions.data;
  } catch (error) {
    console.error('Could not fetch champion data index: ', error);
    throw error;
  }
}

const downloadChampionData = async () => {
  const champions = await getChampionDataIndex();
  console.log(`Found ${champions.length} champions.`);
  console.log(`Excluding ${excludeIds.length} champion IDs.`);
  let progress = 1;
  const total = champions.length - excludeIds.length;

  for (let i = 0; i < champions.length; i++) {
    const [championId, _] = champions[i].name.split('.');
    if (excludeIds.includes(championId)) {
      continue;
    }

    const championDataUrl = `${championsJsonUrl}/${championId}.json`;
    const championPickSfxUrl = `${pickSfxUrl}/${championId}.ogg`;
    const championBanSfxUrl = `${banSfxUrl}/${championId}.ogg`;

    try {
      const { name, spells } = await getChampionData(championDataUrl);
      console.log(`Downloading data for champion: ${name}. ${progress}/${total}`);

      const championPickSfxFilename = path.join(downloadPath, `${name}-pick.ogg`);
      const championBanSfxFilename = path.join(downloadPath, `${name}-ban.ogg`);

      const spellSfxPromises = spells.map(({ spellKey, abilityVideoPath }) => (
        downloadBinary(
          `${abilitySfxUrl}/${abilityVideoPath}`,
          path.join(downloadPath, `${name}-${spellKey}.webm`),
        ))
      );

      await Promise.all([
        ...spellSfxPromises,
        downloadBinary(championPickSfxUrl, championPickSfxFilename),
        downloadBinary(championBanSfxUrl, championBanSfxFilename),
      ])

      progress += 1;
    } catch (error) {
      console.error(`Failed to download data for champion: ${championId}`, error);
      continue;
    }
  }
}

const main = async () => {
  try {
    await downloadChampionData();
    console.log('Champion data downloaded successfully!');
  } catch (error) {
    console.error('An error occurred while downloading champion data:', error);
    process.exit(1);
  }
};

main();
