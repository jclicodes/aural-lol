#!/usr/bin/env node
const Axios = require("axios");

const client = require("https");
const path = require("path");
const fs = require("fs");

const downloadFile = async (url) => {
  return new Promise((resolve, reject) => {
    client.get(url, (res) => {
      if (res.statusCode === 200) {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
          try {
            const parsedData = JSON.parse(rawData);
            resolve(parsedData);
          } catch (e) {
            reject(new Error(`Error parsing JSON from ${url}: ${e.message}`));
          }
        });
        res.on('error', (e) => {
          reject(new Error(`Error downloading ${url}: ${e.message}`));
        });
      } else {
        // Consume response data to free up memory
        res.resume();
        reject(new Error(`Request ${url} Failed With a Status Code: ${res.statusCode}`));
      }
    });
  });
};

const downloadChampionData = async () => {
  const root = path.resolve(__dirname, '..');
  const downloadPath = path.resolve(root, 'website/files');

  const url = "https://raw.communitydragon.org/json/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/";

  Axios.get(url).then(async ({ data }) => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].name == '-1.json') {
        continue;
      }

      let filepath = `${downloadPath}/${data[i].name}`;
      try {
        const rawChampionData = await downloadFile(`${url}${data[i].name}`, filepath);
        const championName = rawChampionData.name;

        filepath = path.join(downloadPath, `${championName}.json`);

        const championData = {
          name: rawChampionData.name,
          spells: rawChampionData.spells,
        };

        fs.writeFileSync(filepath, JSON.stringify(championData));
        console.info(`Downloaded ${filepath}`);
      } catch (e) {
        console.error(`Failed to download ${filepath} ${e}`);
      }
    }
  })
}

downloadChampionData();

