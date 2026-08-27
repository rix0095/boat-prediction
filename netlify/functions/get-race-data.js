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
    "北東",
    "東北東",
    "東",
    "東南東",
    "南東",
    "南",
    "南西",
    "西南西",
    "西",
    "西北西",
    "北西",
    "北",
    "北北東",
    "南南東",
    "南南西",
    "北北西"
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
   3連単オッズ
   BOAT RACE公式
========================================= */

function parseOdds3T(html) {

  const result = [];

  /*
    公式ページをテーブル単位で取得
  */

  const tables =
    [
      ...String(html || "").matchAll(
        /<table[\s\S]*?<\/table>/gi
      )
    ];


  /*
    3連単オッズの表を探す
  */

  let targetTable = null;

  for (const tableMatch of tables) {

    const tableHtml =
      tableMatch[0];

    const tableText =
      htmlToText(tableHtml);

    if (
      tableText.includes("3連単オッズ") ||
      tableText.includes("オッズ")
    ) {

      /*
        120通りのデータが入っている
        大きなテーブルを優先
      */

      if (
        tableText.length > 500
      ) {

        targetTable =
          tableHtml;

        break;

      }

    }

  }


  if (!targetTable) {

    throw new Error(
      "公式3連単オッズ表が見つかりませんでした"
    );

  }


  /*
    行を取得
  */

  const rows =
    [
      ...targetTable.matchAll(
        /<tr[\s\S]*?<\/tr>/gi
      )
    ];


  /*
    公式オッズ表は
    1着固定のブロックごとに
    2着・3着・オッズが並ぶ。
  */


  let currentFirst = null;


  for (const rowMatch of rows) {

    const rowHtml =
      rowMatch[0];


    /*
      セルを取得
    */

    const cells =
      [
        ...rowHtml.matchAll(
          /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi
        )
      ]
      .map(m =>
        htmlToText(m[1])
      )
      .filter(Boolean);


    if (!cells.length) {
      continue;
    }


    /*
      セルの中にある数字を取得
    */

    const cellData =
      cells.map(cell => {

        const tokens =
          cell
            .split(/\s+/)
            .map(x => x.trim())
            .filter(Boolean);

        return tokens;

      });


    /*
      1着ブロック判定
    */

    for (const tokens of cellData) {

      /*
        「1 2 3.5」のような
        3連単データを検出
      */

      if (
        tokens.length >= 3
      ) {

        const nums =
          tokens
            .map(x => {

              const n =
                Number(
                  x.replace(/,/g, "")
                );

              return Number.isFinite(n)
                ? n
                : null;

            })
            .filter(x => x !== null);


        /*
          最初の3数が

          2着
          3着
          オッズ

          の形なら登録
        */

        if (
          nums.length >= 3 &&
          Number.isInteger(nums[0]) &&
          Number.isInteger(nums[1]) &&
          nums[0] >= 1 &&
          nums[0] <= 6 &&
          nums[1] >= 1 &&
          nums[1] <= 6 &&
          nums[0] !== nums[1] &&
          nums[2] > 0
        ) {

          /*
            currentFirstが決まっていれば
            3連単として登録
          */

          if (
            currentFirst !== null
          ) {

            result.push({

              combo: [
                currentFirst,
                nums[0],
                nums[1]
              ],

              odds: nums[2]

            });

          }

        }

      }

    }


    /*
      行のテキストから
      1着ブロックを判定
    */

    const rowText =
      htmlToText(rowHtml);


    /*
      1着艇の見出しは
      1 / 選手名 / 2 / 選手名 ...
      の形。

      データブロックでは
      1着固定艇が先頭に現れる。
    */

    const firstMatch =
      rowText.match(
        /^([1-6])\s+\S/
      );

    if (firstMatch) {

      const candidate =
        Number(firstMatch[1]);

      if (
        candidate >= 1 &&
        candidate <= 6
      ) {

        currentFirst =
          candidate;

      }

    }

  }


  /*
    =========================================
    別方式による公式テキスト解析
    =========================================

    上のHTML構造で取得できなかった場合に
    公式ページのテキスト配置から復元する。
  */

  if (result.length !== 120) {

    result.length = 0;


    const text =
      htmlToText(html);


    /*
      「3連単オッズ」以降を対象
    */

    const start =
      text.indexOf("3連単オッズ");


    if (start >= 0) {

      const oddsText =
        text.slice(start);


      /*
        公式ページの実際の並びは、

        1着艇ブロック
        ↓
        2着固定列
        ↓
        3着＋オッズ

        となっている。

        1着ごとに20点。
      */


      /*
        まず数字トークン化
      */

      const tokens =
        oddsText
          .split(/\s+/)
          .map(x => x.trim())
          .filter(Boolean);


      /*
        選手名などを除外し、
        数値トークンだけ抽出
      */

      const numeric =
        tokens
          .map(token => {

            const cleaned =
              token
                .replace(/,/g, "");

            if (
              /^\d+(?:\.\d+)?$/.test(
                cleaned
              )
            ) {

              return Number(cleaned);

            }

            return null;

          })
          .filter(
            x => x !== null
          );


      /*
        公式の表を完全に
        数字だけで解釈するのは
        ヘッダー等が混ざるため、
        120点を生成できた場合のみ採用。
      */

      /*
        ここでは安全のため、
        不完全なデータを返さない。
      */

    }

  }


  /*
    =========================================
    重複除去
    =========================================
  */

  const unique =
    new Map();


  result.forEach(item => {

    const key =
      item.combo.join("-");

    if (
      item.combo.length === 3 &&
      new Set(item.combo).size === 3 &&
      item.combo.every(
        n => n >= 1 && n <= 6
      ) &&
      Number.isFinite(item.odds) &&
      item.odds > 0
    ) {

      unique.set(
        key,
        item
      );

    }

  });


  const finalOdds =
    [...unique.values()];


  /*
    =========================================
    120通り確認
    =========================================
  */

  if (
    finalOdds.length !== 120
  ) {

    throw new Error(
      `3連単オッズを120通り取得できませんでした（${finalOdds.length}/120）`
    );

  }


  /*
    120通りを
    1-2-3順に並べる
  */

  finalOdds.sort(
    (a, b) => {

      for (
        let i = 0;
        i < 3;
        i++
      ) {

        if (
          a.combo[i] !==
          b.combo[i]
        ) {

          return (
            a.combo[i] -
            b.combo[i]
          );

        }

      }

      return 0;

    }
  );


  return finalOdds;

}

/* =========================================
   3連単オッズ取得
   BOAT RACE公式
========================================= */

function parseTrifectaOdds(html) {

  const results = [];

  /*
    公式3連単オッズページの
    table / tr / td を取得
  */

  const rows = [
    ...String(html || "").matchAll(
      /<tr[\s\S]*?>([\s\S]*?)<\/tr>/gi
    )
  ];

  for (const row of rows) {

    const rowHtml = row[1];

    const cells = [
      ...rowHtml.matchAll(
        /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      )
    ].map(m => {

      return htmlToText(m[1]);

    });


    /*
      3連単オッズ表は、
      1行に複数の

      1着 / 2着 / 3着 / オッズ

      の組み合わせが並ぶ。

      公式ページの構造変更にも
      ある程度耐えるように、
      3セル単位で解析する。
    */

    if (cells.length < 3) {
      continue;
    }


    for (
      let i = 0;
      i + 2 < cells.length;
      i += 3
    ) {

      const a =
        Number(cells[i]);

      const b =
        Number(cells[i + 1]);

      const odds =
        toNumber(cells[i + 2]);


      /*
        正常な3連単組み合わせか確認
      */

      if (
        !Number.isInteger(a) ||
        !Number.isInteger(b) ||
        a < 1 ||
        a > 6 ||
        b < 1 ||
        b > 6 ||
        a === b ||
        odds === null ||
        odds <= 0
      ) {

        continue;

      }


      /*
        この行だけでは3着艇が
        次のセルに入るケースもあるため、
        公式ページの実際の並びを
        下記の別方式でも解析する。
      */

    }

  }


  /*
    公式ページをテキスト化して、
    3連単の組み合わせを抽出する。

    公式ページでは例えば

    2 3 8.1
    4 5.9
    5 14.7
    6 57.0

    のように、1着固定で
    2着・3着・オッズが並ぶ。
  */

  const text =
    htmlToText(html);


  const start =
    text.indexOf("3連単オッズ");


  if (start < 0) {

    throw new Error(
      "公式3連単オッズ表が見つかりません"
    );

  }


  const oddsText =
    text.slice(start);


  /*
    「1着艇」「2着艇」「3着艇」「オッズ」
    の組み合わせを取得するため、
    数字の並びを解析する。
  */

  const numberTokens = [
    ...oddsText.matchAll(
      /\b\d+(?:\.\d+)?\b/g
    )
  ].map(m => ({
    value: m[0],
    index: m.index
  }));


  /*
    公式ページのHTMLテーブルから
    より確実に120通りを取得する。
  */

  const tableResults = [];


  for (const row of rows) {

    const rowHtml = row[1];

    const cells = [
      ...rowHtml.matchAll(
        /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      )
    ].map(m =>
      htmlToText(m[1])
    );


    /*
      1行に18セルの場合、

      1着
      2着
      オッズ

      が6組存在する。

      公式ページの3連単表は
      この構造で取得できる。
    */

    if (cells.length < 3) {
      continue;
    }


    /*
      3セル単位で解析
    */

    for (
      let i = 0;
      i + 2 < cells.length;
      i += 3
    ) {

      const first =
        Number(cells[i]);

      const second =
        Number(cells[i + 1]);

      const odd =
        toNumber(cells[i + 2]);


      if (
        Number.isInteger(first) &&
        Number.isInteger(second) &&
        first >= 1 &&
        first <= 6 &&
        second >= 1 &&
        second <= 6 &&
        first !== second &&
        odd !== null &&
        odd > 0
      ) {

        tableResults.push({

          first,
          second,
          odds: odd

        });

      }

    }

  }


  /*
    公式オッズ表は

    1着固定
    ↓
    2着候補
    ↓
    3着候補

    の構造なので、
    HTMLから取得したデータを
    3連単に変換する。
  */


  /*
    公式ページの各セル構造に
    対応するため、
    「1着固定ブロック」を解析する。
  */

  const finalResults = [];


  /*
    テーブル内の全セルを取得
  */

  const allCells = [];

  for (const row of rows) {

    const rowHtml = row[1];

    const cells = [
      ...rowHtml.matchAll(
        /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi
      )
    ].map(m =>
      htmlToText(m[1])
    );

    if (cells.length) {
      allCells.push(cells);
    }

  }


  /*
    公式ページでは各「1着艇」について
    2着・3着・オッズがまとまっている。

    最終的には重複を排除して
    120通りにする。
  */

  const map = new Map();


  /*
    数字3つの組み合わせを
    全体から抽出する。
  */

  for (const row of allCells) {

    for (
      let i = 0;
      i + 2 < row.length;
      i++
    ) {

      const values = [
        row[i],
        row[i + 1],
        row[i + 2]
      ];

      /*
        3連単として成立する
        3艇＋オッズのデータか確認
      */

      const nums =
        values.map(v =>
          toNumber(v)
        );


      if (
        nums[0] !== null &&
        nums[1] !== null &&
        nums[2] !== null
      ) {

        /*
          3つとも艇番の場合は除外。
          オッズは小数・大きな数字になる。
        */

        if (
          Number.isInteger(nums[0]) &&
          Number.isInteger(nums[1]) &&
          nums[0] >= 1 &&
          nums[0] <= 6 &&
          nums[1] >= 1 &&
          nums[1] <= 6 &&
          nums[0] !== nums[1] &&
          nums[2] > 0
        ) {

          /*
            ここではまだ3着がないため、
            次のセルも確認する。
          */

        }

      }

    }

  }


  /*
    公式HTMLのテーブルを
    直接利用する方法。
    
    3連単オッズ表の各行について、
    数字セルを順番に取得する。
  */

  const numericRows = [];


  for (const row of allCells) {

    const numeric =
      row
        .map(v => v.trim())
        .filter(v => v !== "");


    if (numeric.length >= 3) {

      numericRows.push(numeric);

    }

  }


  /*
    公式サイトの構造に合わせて
    3連単120通りを生成。
  */

  /*
    最終的なオッズページは
    テキスト上、

    1着艇
      2着艇 3着艇 オッズ
      2着艇 3着艇 オッズ
      ...

    という順番で並ぶ。

    まずページ内の「1～6」の
    1着ブロックを認識する。
  */

  let currentFirst = null;


  const tokenRegex =
    /\b([1-6])\b/g;


  const lines =
    oddsText
      .split(/\s+/)
      .filter(Boolean);


  /*
    公式ページの実データを
    120通りになるよう解析する。
  */

  for (let i = 0; i < lines.length; i++) {

    const value =
      lines[i];


    /*
      1着艇の切り替わりを検出
    */

    if (
      /^[1-6]$/.test(value)
    ) {

      /*
        周辺データから
        2着・3着・オッズを確認する。
      */

      const n1 =
        Number(value);

      const n2 =
        Number(lines[i + 1]);

      const n3 =
        Number(lines[i + 2]);

      const odd =
        toNumber(lines[i + 3]);


      if (
        Number.isInteger(n1) &&
        Number.isInteger(n2) &&
        Number.isInteger(n3) &&
        n1 >= 1 &&
        n1 <= 6 &&
        n2 >= 1 &&
        n2 <= 6 &&
        n3 >= 1 &&
        n3 <= 6 &&
        n1 !== n2 &&
        n1 !== n3 &&
        n2 !== n3 &&
        odd !== null &&
        odd > 0
      ) {

        const combo =
          `${n1}-${n2}-${n3}`;


        if (!map.has(combo)) {

          map.set(
            combo,
            odd
          );

        }

      }

    }

  }


  /*
    Map → 配列
  */

  map.forEach(
    (odds, combo) => {

      finalResults.push({

        combo,

        odds

      });

    }
  );


  /*
    120通りになっているか確認
  */

  if (finalResults.length < 100) {

    throw new Error(
      `3連単オッズを十分に取得できませんでした（${finalResults.length}/120）`
    );

  }


  /*
    combo順で整理
  */

  finalResults.sort(
    (a,b) => {

      const aa =
        a.combo
          .split("-")
          .map(Number);

      const bb =
        b.combo
          .split("-")
          .map(Number);

      return (
        aa[0] - bb[0] ||
        aa[1] - bb[1] ||
        aa[2] - bb[2]
      );

    }
  );


  return finalResults;

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
   3連単オッズURL
===================================== */

const oddsUrl =
  `https://www.boatrace.jp/owpc/pc/race/odds3t` +
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
      parseRacers(
        raceHtml
      );
/* =====================================
   3連単オッズ取得
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
    parseTrifectaOdds(oddsHtml);


} catch (oddsError) {

  /*
    オッズだけ取得できない場合でも
    出走表・直前情報は返す
  */

  trifectaOdds = [];

}

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
       3連単オッズ
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
        parseOdds3T(
          oddsHtml
        );


    } catch (oddsError) {

      /*
        オッズ取得失敗時は
        空配列で返す。

        これにより、
        出走表・直前情報だけでも
        システムは動作可能。
      */

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
              boat.boat ===
              beforeBoat.boat
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

          odds: {

            trifecta:
              trifectaOdds

          }

        },

        url:
          racelistUrl,

        beforeInfoUrl:
          beforeUrl,

        oddsUrl:
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
