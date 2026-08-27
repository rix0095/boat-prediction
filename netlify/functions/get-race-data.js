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
    "南南東",
    "南南西",
    "西南西",
    "西北西",
    "北北東",
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


  /* =========================================
     スタート展示
  ========================================= */

  const stSection =
    text.match(
      /コース並びST\s+([\s\S]+?)(?=水面気象情報|投票|レーススケジュール)/
    );


  if (stSection) {

    const stText =
      stSection[1];

    const stMatches =
      [
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

/* =========================================
   3連単オッズ取得
   BOAT RACE公式 odds3t 対応版
========================================= */

function parseTrifectaOdds(html) {

  const text = htmlToText(html);

  /*
    公式3連単オッズ表は、

    1着艇
    ↓
    2着・3着・オッズ
    ↓
    次の1着艇

    という構造になっている。

    例：

    1着 = 1

    2 3 8.1
    4 5.9
    5 14.7
    6 57.0

    つまり、

    1-2-3 = 8.1
    1-2-4 = 5.9
    1-2-5 = 14.7
    1-2-6 = 57.0

    のように、
    「2着艇」が行頭に表示され、
    「3着艇」とオッズが続く。

    公式ページのHTMLをテキスト化すると、
    同じ2着艇が省略される行があるため、
    前の単純な正規表現では正しく120通りを
    作れない。
  */


  /* =========================================
     ① 3連単オッズ部分を取得
  ========================================= */

  const startIndex =
    text.indexOf("3連単オッズ");


  if (startIndex < 0) {

    throw new Error(
      "公式3連単オッズページにオッズ表がありません"
    );

  }


  const oddsText =
    text.slice(startIndex);


  /* =========================================
     ② 公式表の1着艇ごとのブロックを作る
  ========================================= */

  const firstBoatBlocks = [];

  /*
    公式ページでは1着艇ごとに、

    2 3 8.1 ...
    4 5.9 ...
    5 14.7 ...
    6 57.0 ...

    の20通りが並ぶ。

    「1着艇」の判定は、
    6艇の組み合わせが一巡することで
    行われる。
  */


  /*
    まず全ての数値トークンを取得する。

    オッズは整数または小数。
    1000以上のオッズも存在するため、
    そこも許容する。
  */

  const tokens =
    oddsText.match(
      /\b(?:[1-6]|\d+(?:\.\d+)?)\b/g
    ) || [];


  /*
    公式ページは表形式なので、
    完全なDOM解析を行う方が安全。

    HTMLそのものからtable/tr/tdを取得する。
  */

  const tableMatch =
    String(html || "").match(
      /<table[\s\S]*?<\/table>/gi
    ) || [];


  let odds = [];


  /* =========================================
     ③ tableを解析
  ========================================= */

  for (const table of tableMatch) {

    const rows =
      table.match(
        /<tr[\s\S]*?<\/tr>/gi
      ) || [];


    for (const row of rows) {

      const cells =
        row.match(
          /<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi
        ) || [];


      const values =
        cells.map(cell => {

          return htmlToText(cell);

        });


      /*
        1行の中に

        2
        3
        8.1
        1
        3
        31.3
        ...

        のようなデータが入っている。

        3つずつ取り出す。
      */

      for (
        let i = 0;
        i + 2 < values.length;
        i += 3
      ) {

        const a =
          toNumber(values[i]);

        const b =
          toNumber(values[i + 1]);

        const value =
          toNumber(values[i + 2]);


        /*
          3連単オッズとして成立する条件
        */

        if (
          !Number.isInteger(a) ||
          !Number.isInteger(b) ||
          a < 1 ||
          a > 6 ||
          b < 1 ||
          b > 6 ||
          a === b ||
          value === null ||
          value <= 0
        ) {

          continue;

        }


        odds.push({

          second: a,

          third: b,

          odds: value

        });

      }

    }

  }


  /* =========================================
     ④ HTML構造から取れなかった場合の
        フォールバック
  ========================================= */

  if (odds.length < 120) {

    odds = [];


    /*
      公式ページをテキスト化した状態から
      「2着艇 → 3着艇 → オッズ」
      を取得する。

      公式表では各1着艇につき20点。
    */

    const lines =
      oddsText
        .split(/\s+/)
        .filter(Boolean);


    /*
      1着艇ごとのブロックを処理する。

      各ブロックは基本的に20通り。
    */

    let currentFirst = 1;

    let currentSecond = null;

    let blockCount = 0;


    for (
      let i = 0;
      i < lines.length - 2;
      i++
    ) {

      const v1 =
        lines[i];

      const v2 =
        lines[i + 1];

      const v3 =
        lines[i + 2];


      /*
        3つ目がオッズになっているか確認
      */

      const n1 =
        toNumber(v1);

      const n2 =
        toNumber(v2);

      const n3 =
        toNumber(v3);


      if (
        Number.isInteger(n1) &&
        n1 >= 1 &&
        n1 <= 6 &&
        Number.isInteger(n2) &&
        n2 >= 1 &&
        n2 <= 6 &&
        n1 !== n2 &&
        n3 !== null &&
        n3 > 0
      ) {

        /*
          明示的な

          2着 3着 オッズ

          のパターン
        */

        currentSecond = n1;


        odds.push({

          second: n1,

          third: n2,

          odds: n3

        });


        blockCount++;


        /*
          20通り取得したら
          次の1着艇へ
        */

        if (
          blockCount >= 20
        ) {

          currentFirst++;

          blockCount = 0;

          currentSecond = null;

        }

      }

    }

  }


  /* =========================================
     ⑤ 120通りを生成
  ========================================= */

  /*
    現在のoddsは、

    2着
    3着
    オッズ

    の順番で並んでいる。

    公式ページでは1着艇ごとに20点なので、

    1 → 最初の20点
    2 → 次の20点
    3 → 次の20点
    ...

    と割り当てる。
  */

  if (odds.length < 120) {

    throw new Error(
      `公式3連単オッズの取得数不足：${odds.length}/120`
    );

  }


  const result = [];


  for (let first = 1; first <= 6; first++) {

    const start =
      (first - 1) * 20;

    const block =
      odds.slice(
        start,
        start + 20
      );


    /*
      1着艇ごとに20通りあるか確認
    */

    if (block.length !== 20) {

      throw new Error(
        `${first}号艇の3連単オッズが20通りありません`
      );

    }


    block.forEach(item => {

      result.push({

        combo: [
          first,
          item.second,
          item.third
        ],

        odds: item.odds

      });

    });

  }


  /* =========================================
     ⑥ 重複チェック
  ========================================= */

  const unique =
    new Set(
      result.map(
        x => x.combo.join("-")
      )
    );


  if (
    result.length !== 120 ||
    unique.size !== 120
  ) {

    throw new Error(
      `3連単オッズの組み合わせ異常：${unique.size}/120`
    );

  }


  /* =========================================
     ⑦ 120通り全て確認
  ========================================= */

  for (const item of result) {

    const [
      first,
      second,
      third
    ] = item.combo;


    if (
      first === second ||
      first === third ||
      second === third
    ) {

      throw new Error(
        `不正な3連単組み合わせ：${item.combo.join("-")}`
      );

    }


    if (
      !Number.isFinite(item.odds) ||
      item.odds <= 0
    ) {

      throw new Error(
        `不正なオッズ：${item.combo.join("-")}`
      );

    }

  }


  return result;

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
       公式URL
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


    /* =====================================
       ★ 3連単オッズURL
    ===================================== */

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
       ★ 3連単オッズ取得
    ===================================== */

    let trifectaOdds = [];


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


    } catch (oddsError) {

      /*
        オッズがまだ発売前などの場合は
        空配列で返す。

        出走表・直前情報までは
        そのまま利用可能。
      */

      trifectaOdds = [];

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

          tide: null,

          boats,

          /* ===============================
             ★ 3連単オッズ
          =============================== */

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
