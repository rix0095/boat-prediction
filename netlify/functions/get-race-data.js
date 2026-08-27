// Netlify Function
// BOAT RACE公式 出走表＋直前情報＋3連単オッズ取得

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

  const matches = [
    ...text.matchAll(identityRegex)
  ];

  const boats = [];

  for (
    let i = 0;
    i < Math.min(6, matches.length);
    i++
  ) {

    const m = matches[i];

    const registration =
      Number(m[1]);

    const className =
      m[2];

    const name =
      cleanName(m[3]);

    const start =
      m.index + m[0].length;

    const end =
      i + 1 < matches.length
        ? matches[i + 1].index
        : text.length;

    const block =
      text.slice(start, end);

    const statRegex =
      /F\s*(\d+)\s+L\s*(\d+)\s+(\d+\.\d+)\s+(\d+\.\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+\.\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;

    const stats =
      block.match(statRegex);

    let averageST = null;
    let nationalWinRate = null;
    let localWinRate = null;
    let motorNo = null;
    let motor2Rate = null;
    let boatNo = null;
    let boat2Rate = null;

    if (stats) {

      averageST =
        toNumber(stats[3]);

      nationalWinRate =
        toNumber(stats[4]);

      localWinRate =
        toNumber(stats[7]);

      motorNo =
        toNumber(stats[10]);

      motor2Rate =
        toNumber(stats[11]);

      boatNo =
        toNumber(stats[13]);

      boat2Rate =
        toNumber(stats[14]);

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

  const text =
    htmlToText(html);

  const result = {

    weather: null,

    temperature: null,

    waterTemperature: null,

    windDirection: null,

    windSpeed: null,

    wave: null,

    boats: []

  };


  /* 気温 */

  const tempMatch =
    text.match(
      /気温\s*([+-]?\d+(?:\.\d+)?)℃/
    );

  if (tempMatch) {

    result.temperature =
      toNumber(tempMatch[1]);

  }


  /* 水温 */

  const waterMatch =
    text.match(
      /水温\s*([+-]?\d+(?:\.\d+)?)℃/
    );

  if (waterMatch) {

    result.waterTemperature =
      toNumber(waterMatch[1]);

  }


  /* 風速 */

  const windMatch =
    text.match(
      /風速\s*(\d+(?:\.\d+)?)m/
    );

  if (windMatch) {

    result.windSpeed =
      toNumber(windMatch[1]);

  }


  /* 波高 */

  const waveMatch =
    text.match(
      /波高\s*(\d+(?:\.\d+)?)cm/
    );

  if (waveMatch) {

    result.wave =
      toNumber(waveMatch[1]);

  }


  /* 天候 */

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

      result.weather =
        word;

      break;

    }

  }


  /* 風向 */

  const windDirections = [
    "北北東",
    "東北東",
    "東南東",
    "南南東",
    "南南西",
    "西南西",
    "西北西",
    "北北西",
    "北東",
    "南東",
    "南西",
    "北西",
    "東",
    "南",
    "西",
    "北"
  ];

  for (const direction of windDirections) {

    if (text.includes(direction)) {

      result.windDirection =
        direction;

      break;

    }

  }


  /* =========================================
     展示タイム・チルト
  ========================================= */

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


  /* =========================================
     スタート展示
  ========================================= */

  const stSection =
    text.match(
      /コース並びST\s+([\s\S]+?)(?=水面気象情報|投票|レーススケジュール)/
    );


  if (stSection) {

    const stMatches = [
      ...stSection[1].matchAll(
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
   3連単オッズ解析
========================================= */

function parseTrifectaOdds(html) {

  const text =
    htmlToText(html);

  const odds = [];

  const seen =
    new Set();


  /* =========================================
     パターン①
     
     1-2-3 12.3
  ========================================= */

  const regex =
    /([1-6])\s*[-－]\s*([1-6])\s*[-－]\s*([1-6])\s+(\d+(?:\.\d+)?)/g;

  let match;


  while (
    (match = regex.exec(text)) !== null
  ) {

    const a =
      Number(match[1]);

    const b =
      Number(match[2]);

    const c =
      Number(match[3]);

    if (
      a === b ||
      a === c ||
      b === c
    ) {
      continue;
    }


    const value =
      toNumber(match[4]);


    if (value === null) {
      continue;
    }


    const combo =
      `${a}-${b}-${c}`;


    if (seen.has(combo)) {
      continue;
    }


    seen.add(combo);


    odds.push({

      combo,

      odds: value

    });

  }


  /* =========================================
     パターン②
     
     公式HTMLによって
     1-2-3の文字列が分割される場合
  ========================================= */

  if (odds.length < 120) {

    const comboRegex =
      /([1-6])\s*[-－]\s*([1-6])\s*[-－]\s*([1-6])/g;

    const combos = [];

    let comboMatch;


    while (
      (comboMatch =
        comboRegex.exec(text)) !== null
    ) {

      const a =
        Number(comboMatch[1]);

      const b =
        Number(comboMatch[2]);

      const c =
        Number(comboMatch[3]);


      if (
        a === b ||
        a === c ||
        b === c
      ) {
        continue;
      }


      combos.push({

        combo:
          `${a}-${b}-${c}`,

        index:
          comboMatch.index +
          comboMatch[0].length

      });

    }


    for (const item of combos) {

      if (seen.has(item.combo)) {
        continue;
      }


      const after =
        text.slice(
          item.index,
          item.index + 100
        );


      const oddsMatch =
        after.match(
          /^\s*(\d+(?:\.\d+)?)/ 
        );


      if (!oddsMatch) {
        continue;
      }


      const value =
        toNumber(
          oddsMatch[1]
        );


      if (value === null) {
        continue;
      }


      seen.add(item.combo);


      odds.push({

        combo: item.combo,

        odds: value

      });

    }

  }


  /* =========================================
     並び替え
  ========================================= */

  odds.sort((a, b) => {

    const pa =
      a.combo.split("-").map(Number);

    const pb =
      b.combo.split("-").map(Number);


    for (let i = 0; i < 3; i++) {

      if (pa[i] !== pb[i]) {

        return pa[i] - pb[i];

      }

    }

    return 0;

  });


  return odds;

}


/* =========================================
   JSONレスポンス
========================================= */

function jsonResponse(
  data,
  status = 200
) {

  return new Response(

    JSON.stringify(
      data,
      null,
      2
    ),

    {

      status,

      headers: {

        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",

        "Access-Control-Allow-Origin":
          "*"

      }

    }

  );

}


/* =========================================
   メイン
========================================= */

export default async (req) => {

  try {

    /* =====================================
       URL処理
       
       今回のエラー対策
       The string did not match
       the expected pattern.
    ===================================== */

    const requestUrl =
      String(req?.url || "/");


    let url;


    if (
      requestUrl.startsWith("http://") ||
      requestUrl.startsWith("https://")
    ) {

      url =
        new URL(requestUrl);

    } else {

      url =
        new URL(
          requestUrl,
          "https://boat-prediction.netlify.app"
        );

    }


    /* =====================================
       パラメータ
    ===================================== */

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

      return jsonResponse({

        success: false,

        error:
          "開催日・開催場・Rが必要です"

      }, 400);

    }


    /* =====================================
       レース番号確認
    ===================================== */

    const raceNumber =
      Number(race);


    if (
      !Number.isInteger(raceNumber) ||
      raceNumber < 1 ||
      raceNumber > 12
    ) {

      return jsonResponse({

        success: false,

        error:
          "Rは1～12で指定してください"

      }, 400);

    }


    /* =====================================
       開催場コード
    ===================================== */

    const jcd =
      VENUE_CODES[venue];


    if (!jcd) {

      return jsonResponse({

        success: false,

        error:
          `開催場「${venue}」が見つかりません`

      }, 400);

    }


    /* =====================================
       日付
    ===================================== */

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {

      return jsonResponse({

        success: false,

        error:
          "開催日の形式が正しくありません"

      }, 400);

    }


    const normalizedDate =
      date.replace(/-/g, "");


    /* =====================================
       公式URL
    ===================================== */

    const racelistUrl =
      `https://www.boatrace.jp/owpc/pc/race/racelist` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${raceNumber}`;


    const beforeUrl =
      `https://www.boatrace.jp/owpc/pc/race/beforeinfo` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${raceNumber}`;


    const oddsUrl =
      `https://www.boatrace.jp/owpc/pc/race/odds3t` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${raceNumber}`;


    /* =====================================
       HTTPヘッダー
    ===================================== */

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
        {
          method: "GET",
          headers
        }
      );


    if (!raceResponse.ok) {

      throw new Error(
        `公式出走表取得失敗 HTTP ${raceResponse.status}`
      );

    }


    const raceHtml =
      await raceResponse.text();


    /* =====================================
       6艇基本データ
    ===================================== */

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
          {
            method: "GET",
            headers
          }
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
       3連単オッズ取得
    ===================================== */

    let trifectaOdds = [];

    let oddsError = null;


    try {

      const oddsResponse =
        await fetch(
          oddsUrl,
          {
            method: "GET",
            headers
          }
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


      if (
        trifectaOdds.length === 0
      ) {

        oddsError =
          "3連単オッズを解析できませんでした";

      }

    } catch (error) {

      oddsError =
        error.message;

      trifectaOdds = [];

    }


    /* =====================================
       直前情報を6艇へ統合
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
       最終レスポンス
    ===================================== */

    return jsonResponse({

      success: true,

      source:
        "BOAT RACE Official",

      race: {

        venue,

        date:
          normalizedDate,

        race:
          raceNumber,

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

        tide: null,

        boats,

        odds: {

          trifecta:
            trifectaOdds

        },

        oddsCount:
          trifectaOdds.length,

        oddsError

      },

      url:
        racelistUrl,

      beforeInfoUrl:
        beforeUrl,

      oddsUrl

    });


  } catch (error) {

    return jsonResponse({

      success: false,

      error:
        error?.message ||
        "Unknown error"

    }, 500);

  }

};
