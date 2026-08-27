// Netlify Function
// BOAT RACE公式
// 出走表＋直前情報＋3連単オッズ取得

const VENUE_CODES = {
  桐生: "01",
  戸田: "02",
  江戸川: "03",
  平和島: "04",
  多摩川: "05",
  浜名湖: "06",
  蒲郡: "07",
  常滑: "08",
  津: "09",
  三国: "10",
  びわこ: "11",
  住之江: "12",
  尼崎: "13",
  鳴門: "14",
  丸亀: "15",
  児島: "16",
  宮島: "17",
  徳山: "18",
  下関: "19",
  若松: "20",
  芦屋: "21",
  福岡: "22",
  唐津: "23",
  大村: "24"
};


/* =========================================
   HTML → テキスト
========================================= */

function htmlToText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/td>/gi, " ")
    .replace(/<\/th>/gi, " ")
    .replace(/<\/tr>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}


function cleanName(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}


function toNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const n = Number(
    String(value)
      .replace(/,/g, "")
      .trim()
  );

  return Number.isFinite(n) ? n : null;
}


/* =========================================
   出走表
========================================= */

function parseRacers(html) {

  const text = htmlToText(html);

  const identityRegex =
    /(\d{4})\s*\/\s*(A1|A2|B1|B2)\s+(.+?)(?=\s+(?:北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)\/)/g;

  const matches = [...text.matchAll(identityRegex)];

  const boats = [];

  for (
    let i = 0;
    i < Math.min(6, matches.length);
    i++
  ) {

    const m = matches[i];

    const registration = Number(m[1]);
    const className = m[2];
    const name = cleanName(m[3]);

    const start = m.index + m[0].length;

    const end =
      i + 1 < matches.length
        ? matches[i + 1].index
        : text.length;

    const block = text.slice(start, end);

    const statRegex =
      /F\s*(\d+)\s+L\s*(\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;

    const stats = block.match(statRegex);

    let averageST = null;
    let nationalWinRate = null;
    let localWinRate = null;
    let motorNo = null;
    let motor2Rate = null;
    let boatNo = null;
    let boat2Rate = null;

    if (stats) {

      averageST = toNumber(stats[3]);
      nationalWinRate = toNumber(stats[4]);
      localWinRate = toNumber(stats[7]);
      motorNo = toNumber(stats[10]);
      motor2Rate = toNumber(stats[11]);
      boatNo = toNumber(stats[13]);
      boat2Rate = toNumber(stats[14]);

    }

    boats.push({

      boat: i + 1,

      registration,

      name,

      class: className,

      averageST,

      nationalWinRate,

      localWinRate,

      motorNo,

      motor2Rate,

      boatNo,

      boat2Rate,

      exhibitionTime: null,

      tilt: null,

      startExhibition: null

    });

  }

  if (boats.length !== 6) {

    throw new Error(
      `選手データを6艇取得できませんでした（${boats.length}/6）`
    );

  }

  return boats;

}


/* =========================================
   直前情報
========================================= */

function parseBeforeInfo(html) {

  const text = htmlToText(html);

  const result = {

    weather: null,
    temperature: null,
    waterTemperature: null,
    windDirection: null,
    windSpeed: null,
    wave: null,
    boats: []

  };


  const tempMatch =
    text.match(
      /気温\s*([+-]?\d+(?:\.\d+)?)℃/
    );

  if (tempMatch) {
    result.temperature =
      toNumber(tempMatch[1]);
  }


  const waterMatch =
    text.match(
      /水温\s*([+-]?\d+(?:\.\d+)?)℃/
    );

  if (waterMatch) {
    result.waterTemperature =
      toNumber(waterMatch[1]);
  }


  const windMatch =
    text.match(
      /風速\s*(\d+(?:\.\d+)?)m/
    );

  if (windMatch) {
    result.windSpeed =
      toNumber(windMatch[1]);
  }


  const waveMatch =
    text.match(
      /波高\s*(\d+(?:\.\d+)?)cm/
    );

  if (waveMatch) {
    result.wave =
      toNumber(waveMatch[1]);
  }


  const weatherWords = [
    "晴れ",
    "晴",
    "曇り",
    "曇",
    "雨",
    "雪"
  ];

  for (const word of weatherWords) {

    if (text.includes(word)) {

      result.weather = word;

      break;

    }

  }


  const windDirections = [
    "東北東",
    "北東",
    "東南東",
    "南東",
    "南南東",
    "南",
    "南南西",
    "南西",
    "西南西",
    "西",
    "西北西",
    "北西",
    "北北西",
    "北",
    "北北東",
    "東"
  ];

  for (const direction of windDirections) {

    if (text.includes(direction)) {

      result.windDirection = direction;

      break;

    }

  }


  const racerNames = [
    ...text.matchAll(
      /\b(\d)\s+([^\d]+?)\s+\d{1,2}\.\dkg\s+(\d\.\d{2})\s+([+-]?\d+(?:\.\d+)?)/g
    )
  ];


  for (
    let i = 0;
    i < Math.min(6, racerNames.length);
    i++
  ) {

    result.boats.push({

      boat:
        Number(racerNames[i][1]),

      exhibitionTime:
        toNumber(racerNames[i][3]),

      tilt:
        toNumber(racerNames[i][4]),

      startExhibition: null

    });

  }


  const stSection =
    text.match(
      /コース並びST\s+([\s\S]+?)(?=水面気象情報|投票|レーススケジュール)/
    );


  if (stSection) {

    const stText =
      stSection[1];

    const stMatches = [
      ...stText.matchAll(
        /(\d)\s+(F?\.\d{2})/g
      )
    ];


    stMatches.forEach(m => {

      const boat =
        Number(m[1]);

      const value =
        m[2];

      const target =
        result.boats.find(
          x => x.boat === boat
        );

      if (target) {

        target.startExhibition =
          value;

      }

    });

  }


  return result;

}


/* =========================================
   3連単オッズ取得
========================================= */

function parseTrifectaOdds(html) {

  const odds = {};

  // 3連単120通りを最初に作る
  for (let a = 1; a <= 6; a++) {
    for (let b = 1; b <= 6; b++) {
      for (let c = 1; c <= 6; c++) {

        if (a === b || a === c || b === c) {
          continue;
        }

        odds[`${a}-${b}-${c}`] = null;
      }
    }
  }

  const sourceHtml = String(html || "");

  /*
   * =========================================
   * HTMLのtableを解析
   * =========================================
   */

  const tables = [
    ...sourceHtml.matchAll(
      /<table[^>]*>([\s\S]*?)<\/table>/gi
    )
  ];

  let currentFirst = null;
  let foundOdds = 0;

  for (const tableMatch of tables) {

    const tableHtml = tableMatch[1];

    const tableText = htmlToText(tableHtml);

    // 3連単オッズ表以外を除外
    if (
      !tableText.includes("3連単") &&
      !tableText.includes("オッズ")
    ) {
      continue;
    }

    const rows = [
      ...tableHtml.matchAll(
        /<tr[^>]*>([\s\S]*?)<\/tr>/gi
      )
    ];

    for (const rowMatch of rows) {

      const rowHtml = rowMatch[1];

      const cells = [
        ...rowHtml.matchAll(
          /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        )
      ]
      .map(m => htmlToText(m[1]))
      .filter(Boolean);

      if (!cells.length) {
        continue;
      }

      /*
       * 1着を探す
       *
       * rowspan等で1着が毎行存在しないため、
       * 見つかった場合だけ更新する。
       */

      for (const cell of cells) {

        const match = cell.match(/^([1-6])$/);

        if (match) {

          const possibleFirst =
            Number(match[1]);

          /*
           * 3連単表の1着番号として使用
           */
          if (possibleFirst >= 1 && possibleFirst <= 6) {
            currentFirst = possibleFirst;
            break;
          }
        }
      }

      if (currentFirst === null) {
        continue;
      }

      /*
       * 行の中から
       *
       * 2着
       * 3着
       * オッズ
       *
       * の組み合わせを探す
       */

      for (let i = 0; i < cells.length; i++) {

        const secondMatch =
          cells[i].match(/^([1-6])$/);

        if (!secondMatch) {
          continue;
        }

        const second =
          Number(secondMatch[1]);

        if (second === currentFirst) {
          continue;
        }

        if (i + 2 >= cells.length) {
          continue;
        }

        const thirdMatch =
          cells[i + 1].match(/^([1-6])$/);

        if (!thirdMatch) {
          continue;
        }

        const third =
          Number(thirdMatch[1]);

        if (
          third === currentFirst ||
          third === second
        ) {
          continue;
        }

        /*
         * オッズ
         */
        const oddsText =
          String(cells[i + 2])
            .replace(/,/g, "")
            .trim();

        /*
         * 「-」や「発売なし」などは除外
         */
        const oddsMatch =
          oddsText.match(
            /^(\d+(?:\.\d+)?)$/
          );

        if (!oddsMatch) {
          continue;
        }

        const odd =
          Number(oddsMatch[1]);

        if (
          !Number.isFinite(odd) ||
          odd <= 0
        ) {
          continue;
        }

        const key =
          `${currentFirst}-${second}-${third}`;

        if (Object.prototype.hasOwnProperty.call(odds, key)) {

          if (odds[key] === null) {
            foundOdds++;
          }

          odds[key] = odd;
        }
      }
    }
  }

  /*
   * =========================================
   * フォールバック解析
   * =========================================
   *
   * table構造で取れなかった場合、
   * HTML全体から3連単の組み合わせを探す。
   */

  if (foundOdds < 120) {

    const text =
      htmlToText(sourceHtml);

    /*
     * 3連単オッズ周辺だけを対象
     */
    const sectionMatch =
      text.match(
        /3連単オッズ([\s\S]*?)(?:締切時オッズ|ボートレースガイド|$)/
      );

    const target =
      sectionMatch
        ? sectionMatch[1]
        : text;

    /*
     * 「1-2-3」のような表記が存在する場合
     */
    const directRegex =
      /([1-6])\s*[-－]\s*([1-6])\s*[-－]\s*([1-6])\s+(\d+(?:\.\d+)?)/g;

    for (const match of target.matchAll(directRegex)) {

      const first = Number(match[1]);
      const second = Number(match[2]);
      const third = Number(match[3]);
      const odd = Number(match[4]);

      if (
        first === second ||
        first === third ||
        second === third
      ) {
        continue;
      }

      if (
        !Number.isFinite(odd) ||
        odd <= 0
      ) {
        continue;
      }

      const key =
        `${first}-${second}-${third}`;

      if (
        Object.prototype.hasOwnProperty.call(odds, key) &&
        odds[key] === null
      ) {

        odds[key] = odd;
        foundOdds++;
      }
    }
  }

  /*
   * =========================================
   * メタ情報
   * =========================================
   */

  odds._meta = {
    foundOdds,
    totalCombinations: 120,
    complete: foundOdds === 120
  };

  return odds;
}

/* =========================================
   メイン
========================================= */

export default async (req) => {

  try {

    const url =
      new URL(req.url);


    const date =
      url.searchParams.get("date");

    const venue =
      url.searchParams.get("venue");

    const race =
      url.searchParams.get("race");


    /* =====================================
       入力確認
    ===================================== */

    if (
      !date ||
      !venue ||
      !race
    ) {

      return new Response(

        JSON.stringify({

          success: false,

          error:
            "開催日・開催場・Rが必要です"

        }),

        {

          status: 400,

          headers: {

            "Content-Type":
              "application/json; charset=utf-8"

          }

        }

      );

    }


    /* =====================================
       開催場コード
    ===================================== */

    const jcd =
      VENUE_CODES[venue];


    if (!jcd) {

      return new Response(

        JSON.stringify({

          success: false,

          error:
            `開催場「${venue}」が見つかりません`

        }),

        {

          status: 400,

          headers: {

            "Content-Type":
              "application/json; charset=utf-8"

          }

        }

      );

    }


    const normalizedDate =
      date.replace(/-/g, "");


    /* =====================================
       URL
    ===================================== */

    const racelistUrl =
      `https://www.boatrace.jp/owpc/pc/race/racelist` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${race}`;


    const beforeUrl =
      `https://www.boatrace.jp/owpc/pc/race/beforeinfo` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${race}`;


    const oddsUrl =
      `https://www.boatrace.jp/owpc/pc/race/odds3t` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${race}`;


    const headers = {

      "User-Agent":
        "Mozilla/5.0 " +
        "(iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
        "AppleWebKit/605.1.15 " +
        "Version/17.0 Mobile/15E148 Safari/604.1",

      "Accept":
        "text/html,application/xhtml+xml," +
        "application/xml;q=0.9,*/*;q=0.8",

      "Accept-Language":
        "ja-JP,ja;q=0.9"

    };


    /* =====================================
       出走表取得
    ===================================== */

    const raceResponse =
      await fetch(
        racelistUrl,
        { headers }
      );


    if (!raceResponse.ok) {

      throw new Error(
        `公式出走表取得失敗 HTTP ${raceResponse.status}`
      );

    }


    const raceHtml =
      await raceResponse.text();


    const boats =
      parseRacers(raceHtml);


    /* =====================================
       直前情報
    ===================================== */

    let before = {

      weather: null,
      temperature: null,
      waterTemperature: null,
      windDirection: null,
      windSpeed: null,
      wave: null,
      boats: []

    };


    try {

      const beforeResponse =
        await fetch(
          beforeUrl,
          { headers }
        );


      if (beforeResponse.ok) {

        const beforeHtml =
          await beforeResponse.text();


        before =
          parseBeforeInfo(
            beforeHtml
          );

      }

    } catch (beforeError) {

      before = {

        weather: null,
        temperature: null,
        waterTemperature: null,
        windDirection: null,
        windSpeed: null,
        wave: null,
        boats: []

      };

    }


    /* =====================================
       直前情報を統合
    ===================================== */

    before.boats.forEach(
      beforeBoat => {

        const target =
          boats.find(
            boat =>
              boat.boat === beforeBoat.boat
          );


        if (!target) {
          return;
        }


        if (
          beforeBoat.exhibitionTime !== null
        ) {

          target.exhibitionTime =
            beforeBoat.exhibitionTime;

        }


        if (
          beforeBoat.tilt !== null
        ) {

          target.tilt =
            beforeBoat.tilt;

        }


        if (
          beforeBoat.startExhibition !== null
        ) {

          target.startExhibition =
            beforeBoat.startExhibition;

        }

      }
    );


    /* =====================================
       3連単オッズ取得
    ===================================== */

    let trifectaOdds = {};


    try {

      const oddsResponse =
        await fetch(
          oddsUrl,
          { headers }
        );


      if (!oddsResponse.ok) {

        throw new Error(
          `公式オッズ取得失敗 HTTP ${oddsResponse.status}`
        );

      }


   const oddsHtml =
  await oddsResponse.text();

trifectaOdds =
  parseTrifectaOdds(
    oddsHtml
  );

// オッズ取得状況を確認
console.log("===== ODDS DEBUG =====");
console.log("odds status:", oddsResponse.status);
console.log("odds html length:", oddsHtml.length);
console.log(
  "contains 3連単:",
  oddsHtml.includes("3連単")
);
console.log(
  "contains オッズ:",
  oddsHtml.includes("オッズ")
);
console.log(
  "first 500 chars:",
  oddsHtml.substring(0, 500)
);
console.log("======================");

    } catch (oddsError) {

      /*
       * オッズ取得失敗でも
       * 出走表・直前情報は返す
       */

      trifectaOdds = {

        _meta: {

          error:
            oddsError.message ||
            "オッズ解析エラー",

          foundRows: 0,

          foundOdds: 0,

          totalCombinations: 120

        }

      };

    }


    /* =====================================
       最終レスポンス
    ===================================== */

    return new Response(

      JSON.stringify({

        success: true,

        source:
          "BOAT RACE Official",

        race: {

          venue,

          date:
            normalizedDate,

          race:
            Number(race),

          weather:
            before.weather,

          temperature:
            before.temperature,

          waterTemperature:
            before.waterTemperature,

          windDirection:
            before.windDirection,

          windSpeed:
            before.windSpeed,

          wave:
            before.wave,

          tide:
            null,

          boats,

          odds: {

            trifecta:
              trifectaOdds

          }

        },

        url:
          racelistUrl,

        beforeInfoUrl:
          beforeUrl,

        oddsUrl

      }, null, 2),

      {

        status: 200,

        headers: {

          "Content-Type":
            "application/json; charset=utf-8",

          "Cache-Control":
            "no-store"

        }

      }

    );


  } catch (error) {

    return new Response(

      JSON.stringify({

        success: false,

        error:
          error.message ||
          "Unknown error"

      }),

      {

        status: 500,

        headers: {

          "Content-Type":
            "application/json; charset=utf-8"

        }

      }

    );

  }

};
