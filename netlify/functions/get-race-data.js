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
   共通
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
    "東南東",
    "南東",
    "南南東",
    "南南西",
    "南西",
    "西南西",
    "西北西",
    "北西",
    "北北西",
    "北北東",
    "北東",
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


  const racerNames =
    [
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


  return result;

}


/* =========================================
   3連単オッズ取得
========================================= */

/*
  公式ページ：

  /owpc/pc/race/odds3t
*/

function parseTrifectaOdds(html) {

  const text =
    htmlToText(html);

  const odds = {};


  /*
    公式ページのテキストでは、

    2 3 4.5
    4 11.4
    5 13.1
    6 110.0

    のように、

    1着固定
    → 2着
    → オッズ

    の順番で並んでいる。
  */


  /*
    「3連単オッズ」以降を取得
  */

  const startIndex =
    text.indexOf("3連単オッズ");

  if (startIndex < 0) {

    throw new Error(
      "公式3連単オッズページを解析できませんでした"
    );

  }


  const oddsText =
    text.slice(startIndex);


  /*
    公式ページの数字列から
    3連単を抽出する。
  */


  const tokens =
    oddsText.match(
      /\d+(?:\.\d+)?/g
    ) || [];


  /*
    公式ページは6艇×5×4＝120点。

    ただしページ上部には艇番や選手名なども
    存在するため、単純な全数字解析は危険。

    そこでHTMLのtable行を直接解析する。
  */


  const rowRegex =
    /<tr[^>]*>([\s\S]*?)<\/tr>/gi;

  const rows =
    [...String(html).matchAll(rowRegex)];


  for (const rowMatch of rows) {

    const rowHtml =
      rowMatch[1];


    const cells =
      [
        ...rowHtml.matchAll(
          /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
        )
      ].map(
        m => htmlToText(m[1])
      );


    /*
      空行や見出しを除外
    */

    if (cells.length < 2) {
      continue;
    }


    /*
      行内にある
      1～6の数字を探す。

      公式の3連単表は

      2着
      3着
      オッズ

      のセット。
    */

    const numbers =
      cells
        .map(x => x.trim())
        .filter(x => x !== "");


    /*
      最初のセルが1着艇。
      その後、

      2着
      オッズ
      2着
      オッズ

      と続く。
    */

    let first = null;


    /*
      行の先頭にある艇番を取得
    */

    for (const value of numbers) {

      const n =
        Number(value);

      if (
        Number.isInteger(n) &&
        n >= 1 &&
        n <= 6
      ) {

        first = n;

        break;

      }

    }


    if (!first) {
      continue;
    }


    /*
      セルを左から順番に処理。
    */

    for (
      let i = 0;
      i < numbers.length - 1;
      i++
    ) {

      const second =
        Number(numbers[i]);

      const odd =
        Number(numbers[i + 1]);


      if (
        !Number.isInteger(second) ||
        second < 1 ||
        second > 6
      ) {
        continue;
      }


      if (
        !Number.isFinite(odd) ||
        odd <= 0
      ) {
        continue;
      }


      /*
        同一艇は除外
      */

      if (first === second) {
        continue;
      }


      /*
        3着候補は次のセル以降。
      */

      for (
        let j = i + 2;
        j < numbers.length - 1;
        j += 2
      ) {

        const third =
          Number(numbers[j]);


        const thirdOdds =
          Number(numbers[j + 1]);


        if (
          !Number.isInteger(third) ||
          third < 1 ||
          third > 6
        ) {
          continue;
        }


        if (
          !Number.isFinite(thirdOdds) ||
          thirdOdds <= 0
        ) {
          continue;
        }


        if (
          third === first ||
          third === second
        ) {
          continue;
        }


        /*
          公式ページの表は
          1着ごとに2着・3着の組み合わせが
          行単位で配置されているため、
          最初に成立した値を保存。
        */

        const key =
          `${first}-${second}-${third}`;


        if (
          !Object.prototype.hasOwnProperty.call(
            odds,
            key
          )
        ) {

          odds[key] =
            thirdOdds;

        }

      }

    }

  }


  /*
    120点取得できなかった場合
    別方式でテキスト解析。
  */

  if (
    Object.keys(odds).length < 100
  ) {

    const fallback =
      parseOddsFromText(text);


    Object.assign(
      odds,
      fallback
    );

  }


  return odds;

}


/* =========================================
   オッズテキスト解析
========================================= */

function parseOddsFromText(text) {

  const odds = {};

  const lines =
    String(text)
      .split(/\s+/)
      .filter(Boolean);


  /*
    公式オッズページでは
    1着ごとに4×5の組み合わせが
    順番に並んでいる。

    取得できた数字列を
    3連単の組み合わせとして再構成する。
  */

  for (let first = 1; first <= 6; first++) {

    const others =
      [1,2,3,4,5,6]
        .filter(x => x !== first);


    /*
      公式表は2着候補ごとに
      3着4通り。
    */

    for (let s = 0; s < others.length; s++) {

      const second =
        others[s];


      const thirds =
        others.filter(
          x => x !== second
        );


      for (
        let t = 0;
        t < thirds.length;
        t++
      ) {

        const third =
          thirds[t];


        const key =
          `${first}-${second}-${third}`;


        /*
          このfallbackでは
          数字列の位置特定が難しいため
          後でHTML解析結果を優先する。
        */

        if (
          !odds[key]
        ) {
          odds[key] = null;
        }

      }

    }

  }


  /*
    nullは除去
  */

  Object.keys(odds).forEach(key => {

    if (
      odds[key] === null
    ) {
      delete odds[key];
    }

  });


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
       出走表
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

    } catch (error) {

      console.log(
        "beforeinfo error:",
        error.message
      );

    }


    /* =====================================
       直前情報統合
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
       3連単オッズ
    ===================================== */

    let trifectaOdds = {};

    let oddsStatus =
      "取得失敗";


    try {

      const oddsResponse =
        await fetch(
          oddsUrl,
          { headers }
        );


      if (
        oddsResponse.ok
      ) {

        const oddsHtml =
          await oddsResponse.text();


        trifectaOdds =
          parseTrifectaOdds(
            oddsHtml
          );


        const count =
          Object.keys(
            trifectaOdds
          ).length;


        if (count > 0) {

          oddsStatus =
            `取得成功 ${count}点`;

        }

      }

    } catch (error) {

      console.log(
        "odds error:",
        error.message
      );

    }


    /* =====================================
       レスポンス
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

          tide: null,

          boats,


          /* ===============================
             オッズ
          =============================== */

          odds: {

            trifecta:
              trifectaOdds,

            count:
              Object.keys(
                trifectaOdds
              ).length,

            status:
              oddsStatus

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
