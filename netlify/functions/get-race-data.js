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

function cleanText(value) {
  return (value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return cleanText(
    String(value || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
  );
}

function toNumber(value) {
  if (value === undefined || value === null) return null;

  const match = String(value).replace(",", "").match(/-?\d+(?:\.\d+)?/);

  return match ? Number(match[0]) : null;
}

function parseRacers(html) {
  const result = [];

  /*
   * 公式出走表の選手情報を取得。
   * HTML構造の変更に備えて、まず選手名・級別を
   * テキストから抽出する。
   */

  const text = stripTags(html);

  const classes = text.match(/\b(?:A1|A2|B1|B2)\b/g) || [];

  /*
   * 公式ページ内には同じ級別が複数存在するため、
   * 選手名候補をリンク/画像周辺から拾う。
   */

  const nameMatches = [
    ...html.matchAll(
      /(?:href="[^"]*\/racer\/[^"]*"[^>]*>|class="[^"]*is-fs[^"]*"[^>]*>)([^<]{2,20})/gi
    )
  ];

  const names = nameMatches
    .map(m => cleanText(stripTags(m[1])))
    .filter(x => x.length >= 2);

  /*
   * 取得できた名前・級別を6艇へ割り当てる。
   * 取得できない項目はnullとして返す。
   */

  for (let i = 0; i < 6; i++) {
    result.push({
      boat: i + 1,
      name: names[i] || "",
      class: classes[i] || "",
      nationalWinRate: null,
      localWinRate: null,
      averageST: null,
      motorNo: null,
      motor2Rate: null,
      boatNo: null,
      boat2Rate: null
    });
  }

  return result;
}

export default async (req) => {
  try {
    const url = new URL(req.url);

    const date = url.searchParams.get("date");
    const venue = url.searchParams.get("venue");
    const race = url.searchParams.get("race");

    if (!date || !venue || !race) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "date・venue・race が必要です"
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        }
      );
    }

    const jcd = VENUE_CODES[venue];

    if (!jcd) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `開催場「${venue}」が見つかりません`
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          }
        }
      );
    }

    const normalizedDate = date.replace(/-/g, "");

    const targetUrl =
      `https://www.boatrace.jp/owpc/pc/race/racelist` +
      `?hd=${normalizedDate}&jcd=${jcd}&rno=${race}`;

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15"
      }
    });

    if (!response.ok) {
      throw new Error(
        `公式サイト取得失敗 HTTP ${response.status}`
      );
    }

    const html = await response.text();

    const boats = parseRacers(html);

    return new Response(
      JSON.stringify(
        {
          success: true,
          source: "BOAT RACE Official",
          date: normalizedDate,
          venue,
          race: Number(race),
          url: targetUrl,
          boats
        },
        null,
        2
      ),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        }
      }
    );
  }
};
