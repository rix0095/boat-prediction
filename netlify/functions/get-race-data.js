// Netlify Function
// BOAT RACE公式 出走表から6艇の基本データを取得

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
   基本ユーティリティ
========================================= */

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function decodeHtml(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}


function stripTags(value) {

  return decodeHtml(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/td>/gi, "\t")
      .replace(/<\/th>/gi, "\t")
      .replace(/<\/tr>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  )
  .replace(/\r/g, "")
  .split("\n")
  .map(x => cleanText(x))
  .filter(Boolean)
  .join("\n");
}


function toNumber(value) {

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const match = String(value)
    .replace(/,/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}


/* =========================================
   HTMLから<tr>単位で取得
========================================= */

function getTableRows(html) {

  const matches = [
    ...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)
  ];

  return matches.map(m => {

    const raw = m[1];

    const text = decodeHtml(
      raw
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/td>/gi, "\t")
        .replace(/<\/th>/gi, "\t")
        .replace(/<[^>]+>/g, " ")
    )
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n+/g, " ")
    .trim();

    return text;

  }).filter(Boolean);
}


/* =========================================
   6艇の出走表行を探す
========================================= */

function findRacerRows(html) {

  const rows = getTableRows(html);

  /*
   * 公式出走表の選手行には
   *
   * 登録番号 / 級別
   *
   * が存在する。
   *
   * 例：
   * 4661 / A2 中島　昂章
   */

  return rows.filter(row => {

    return /\b\d{4}\s*\/\s*(?:A1|A2|B1|B2)\b/.test(row);

  }).slice(0, 6);
}


/* =========================================
   選手名・級別
========================================= */

function parseRacerIdentity(row) {

  const match = row.match(
    /(\d{4})\s*\/\s*(A1|A2|B1|B2)\s+(.+?)\s+(?:北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)\/
  );

  if (!match) {

    const simple = row.match(
      /(\d{4})\s*\/\s*(A1|A2|B1|B2)\s+(.+?)(?:\s+\d{1,2}歳\/)/
    );

    if (!simple) {

      return {
        registration: null,
        class: "",
        name: ""
      };

    }

    return {
      registration: Number(simple[1]),
      class: simple[2],
      name: cleanText(simple[3])
    };

  }

  return {
    registration: Number(match[1]),
    class: match[2],
    name: cleanText(match[3])
  };
}


/* =========================================
   ST・勝率・モーター・ボート
========================================= */

function parseRacerStats(row) {

  /*
   * 選手行の基本構造
   *
   * 登録番号 / 級別 氏名
   * 支部/出身地
   * 年齢/体重
   * F数
   * L数
   * 平均ST
   *
   * 全国
   * 勝率
   * 2連率
   * 3連率
   *
   * 当地
   * 勝率
   * 2連率
   * 3連率
   *
   * モーター
   * No
   * 2連率
   * 3連率
   *
   * ボート
   * No
   * 2連率
   * 3連率
   */

  const identity = parseRacerIdentity(row);

  /*
   * 平均ST
   *
   * F0 L0 0.18
   * のような部分を取得
   */

  let averageST = null;

  const stMatch = row.match(
    /F\d+\s+L\d+\s+(\d+\.\d+)/
  );

  if (stMatch) {
    averageST = toNumber(stMatch[1]);
  }


  /*
   * 選手情報より後ろの数値を取得
   */

  let afterIdentity = row;

  if (identity.registration) {

    const index = row.indexOf(
      String(identity.registration)
    );

    if (index >= 0) {
      afterIdentity = row.slice(index);
    }

  }


  /*
   * 平均STの後ろから数値を取得
   */

  let statPart = afterIdentity;

  if (stMatch) {

    const stIndex =
      afterIdentity.indexOf(stMatch[1]);

    if (stIndex >= 0) {
      statPart =
        afterIdentity.slice(stIndex + stMatch[1].length);
    }

  }


  /*
   * 数値を全部抽出
   */

  const numbers = [
    ...statPart.matchAll(
      /-?\d+(?:\.\d+)?/g
    )
  ].map(m => Number(m[0]));


  /*
   * 出走表の基本的な並びから取得
   *
   * 全国勝率
   * 全国2連率
   * 全国3連率
   *
   * 当地勝率
   * 当地2連率
   * 当地3連率
   *
   * モーターNo
   * モーター2連率
   * モーター3連率
   *
   * ボートNo
   * ボート2連率
   * ボート3連率
   */

  let nationalWinRate = null;
  let localWinRate = null;
  let motorNo = null;
  let motor2Rate = null;
  let boatNo = null;
  let boat2Rate = null;


  /*
   * 公式HTMLの行から
   * まずST以降の数値列を利用する。
   *
   * 数値の先頭にはレース情報などが
   * 入る場合があるため、候補を検査する。
   */

  for (let i = 0; i < numbers.length - 11; i++) {

    const n1 = numbers[i];
    const n2 = numbers[i + 1];
    const n3 = numbers[i + 2];

    const n4 = numbers[i + 3];
    const n5 = numbers[i + 4];
    const n6 = numbers[i + 5];

    const n7 = numbers[i + 6];
    const n8 = numbers[i + 7];
    const n9 = numbers[i + 8];

    const n10 = numbers[i + 9];
    const n11 = numbers[i + 10];
    const n12 = numbers[i + 11];

    /*
     * 勝率は通常0～10程度
     * 2連率・3連率は0～100程度
     * モーター/ボートNoは1～100程度
     */

    if (
      n1 >= 0 &&
      n1 <= 10 &&
      n2 >= 0 &&
      n2 <= 100 &&
      n3 >= 0 &&
      n3 <= 100 &&

      n4 >= 0 &&
      n4 <= 10 &&
      n5 >= 0 &&
      n5 <= 100 &&
      n6 >= 0 &&
      n6 <= 100 &&

      n7 >= 1 &&
      n7 <= 100 &&
      n8 >= 0 &&
      n8 <= 100 &&
      n9 >= 0 &&
      n9 <= 100 &&

      n10 >= 1 &&
      n10 <= 100 &&
      n11 >= 0 &&
      n11 <= 100 &&
      n12 >= 0 &&
      n12 <= 100
    ) {

      nationalWinRate = n1;
      localWinRate = n4;

      motorNo = n7;
      motor2Rate = n8;

      boatNo = n10;
      boat2Rate = n11;

      break;
    }
  }


  /*
   * どうしても数値列を取れない場合、
   * row全体から勝率らしい数値を探す。
   */

  if (nationalWinRate === null) {

    const fallback = row.match(
      /(?:L\d+\s+)?(\d\.\d{2})\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})\s+(\d\.\d{2})\s+(\d{1,2}\.\d{2})\s+(\d{1,2}\.\d{2})/
    );

    if (fallback) {

      nationalWinRate = toNumber(fallback[1]);
      localWinRate = toNumber(fallback[4]);

    }

  }


  return {

    registration: identity.registration,

    name: identity.name,

    class: identity.class,

    averageST,

    nationalWinRate,

    localWinRate,

    motorNo,

    motor2Rate,

    boatNo,

    boat2Rate

  };

}


/* =========================================
   6艇データ作成
========================================= */

function parseRacers(html) {

  const rows = findRacerRows(html);

  const result = [];

  for (let i = 0; i < 6; i++) {

    const row = rows[i];

    if (!row) {

      result.push({
        boat: i + 1,
        name: "",
        class: "",
        nationalWinRate: null,
        localWinRate: null,
        averageST: null,
        motorNo: null,
        motor2Rate: null,
        boatNo: null,
        boat2Rate: null
      });

      continue;
    }

    const parsed = parseRacerStats(row);

    result.push({

      boat: i + 1,

      name: parsed.name || "",

      class: parsed.class || "",

      nationalWinRate:
        parsed.nationalWinRate,

      localWinRate:
        parsed.localWinRate,

      averageST:
        parsed.averageST,

      motorNo:
        parsed.motorNo,

      motor2Rate:
        parsed.motor2Rate,

      boatNo:
        parsed.boatNo,

      boat2Rate:
        parsed.boat2Rate

    });

  }

  return result;
}


/* =========================================
   Netlify Function
========================================= */

export default async (req) => {

  try {

    const url = new URL(req.url);

    const date =
      url.searchParams.get("date");

    const venue =
      url.searchParams.get("venue");

    const race =
      url.searchParams.get("race");


    if (!date || !venue || !race) {

      return new Response(
        JSON.stringify({
          success: false,
          error:
            "date・venue・race が必要です"
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


    const targetUrl =
      `https://www.boatrace.jp/owpc/pc/race/racelist` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${race}`;


    const response =
      await fetch(targetUrl, {

        headers: {

          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) " +
            "AppleWebKit/605.1.15 " +
            "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",

          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

          "Accept-Language":
            "ja-JP,ja;q=0.9"

        }

      });


    if (!response.ok) {

      throw new Error(
        `公式サイト取得失敗 HTTP ${response.status}`
      );

    }


    const html =
      await response.text();


    const boats =
      parseRacers(html);


    /*
     * デバッグ用。
     * 6艇が正しく取れているか確認しやすくする。
     */

    const validCount =
      boats.filter(
        b =>
          b.name &&
          b.class
      ).length;


    if (validCount < 6) {

      throw new Error(
        `出走表の解析に失敗しました。` +
        `取得できた選手データ：${validCount}/6`
      );

    }


    return new Response(

      JSON.stringify({

        success: true,

        source:
          "BOAT RACE Official",

        date:
          normalizedDate,

        venue,

        race:
          Number(race),

        url:
          targetUrl,

        boats

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
