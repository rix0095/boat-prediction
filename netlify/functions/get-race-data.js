// Netlify Function
// BOAT RACE公式
// 出走表 + 直前情報を取得

const VENUE_CODES = {
  桐生:"01",
  戸田:"02",
  江戸川:"03",
  平和島:"04",
  多摩川:"05",
  浜名湖:"06",
  蒲郡:"07",
  常滑:"08",
  津:"09",
  三国:"10",
  びわこ:"11",
  住之江:"12",
  尼崎:"13",
  鳴門:"14",
  丸亀:"15",
  児島:"16",
  宮島:"17",
  徳山:"18",
  下関:"19",
  若松:"20",
  芦屋:"21",
  福岡:"22",
  唐津:"23",
  大村:"24"
};


/* =========================================
   HTML → テキスト
========================================= */

function htmlToText(html){

  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi," ")
    .replace(/<style[\s\S]*?<\/style>/gi," ")
    .replace(/<br\s*\/?>/gi," ")
    .replace(/<\/td>/gi," ")
    .replace(/<\/th>/gi," ")
    .replace(/<\/tr>/gi," ")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," ")
    .replace(/&amp;/gi,"&")
    .replace(/&quot;/gi,'"')
    .replace(/&#39;/gi,"'")
    .replace(/&#x27;/gi,"'")
    .replace(/&lt;/gi,"<")
    .replace(/&gt;/gi,">")
    .replace(/\s+/g," ")
    .trim();

}


function cleanName(value){

  return String(value || "")
    .replace(/\s+/g," ")
    .trim();

}


function toNumber(value){

  if(
    value === undefined ||
    value === null ||
    value === ""
  ){
    return null;
  }

  const n = Number(
    String(value)
      .replace(/,/g,"")
      .trim()
  );

  return Number.isFinite(n) ? n : null;

}


/* =========================================
   6艇基本データ
========================================= */

function parseRacers(html){

  const text = htmlToText(html);

  const identityRegex =
    /(\d{4})\s*\/\s*(A1|A2|B1|B2)\s+(.+?)(?=\s+(?:北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)\/)/g;

  const matches = [...text.matchAll(identityRegex)];

  const boats = [];

  for(let i=0;i<Math.min(6,matches.length);i++){

    const m = matches[i];

    const registration = Number(m[1]);
    const className = m[2];
    const name = cleanName(m[3]);

    const start = m.index + m[0].length;

    const end =
      i + 1 < matches.length
        ? matches[i+1].index
        : text.length;

    const block = text.slice(start,end);

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

    if(stats){

      averageST = toNumber(stats[3]);
      nationalWinRate = toNumber(stats[4]);
      localWinRate = toNumber(stats[7]);

      motorNo = toNumber(stats[10]);
      motor2Rate = toNumber(stats[11]);

      boatNo = toNumber(stats[13]);
      boat2Rate = toNumber(stats[14]);

    }

    boats.push({

      boat:i+1,
      registration,
      name,
      class:className,

      averageST,
      nationalWinRate,
      localWinRate,

      motorNo,
      motor2Rate,

      boatNo,
      boat2Rate

    });

  }

  if(boats.length !== 6){

    throw new Error(
      `選手データを6艇取得できませんでした（${boats.length}/6）`
    );

  }

  return boats;

}


/* =========================================
   直前情報解析
========================================= */

function parseBeforeInfo(html){

  const text = htmlToText(html);

  const result = {

    weather:null,
    temperature:null,
    waterTemperature:null,
    windDirection:null,
    windSpeed:null,
    wave:null,

    boats:[]

  };


  /* =========================================
     気象
  ========================================= */

  const tempMatch =
    text.match(/気温\s*([+-]?\d+(?:\.\d+)?)℃/);

  const waterMatch =
    text.match(/水温\s*([+-]?\d+(?:\.\d+)?)℃/);

  const windMatch =
    text.match(/風速\s*(\d+(?:\.\d+)?)m/);

  const waveMatch =
    text.match(/波高\s*(\d+(?:\.\d+)?)cm/);


  if(tempMatch)
    result.temperature =
      toNumber(tempMatch[1]);

  if(waterMatch)
    result.waterTemperature =
      toNumber(waterMatch[1]);

  if(windMatch)
    result.windSpeed =
      toNumber(windMatch[1]);

  if(waveMatch)
    result.wave =
      toNumber(waveMatch[1]);


  /* =========================================
     天候
  ========================================= */

  const weatherWords = [
    "晴れ",
    "晴",
    "曇り",
    "曇",
    "雨",
    "雪"
  ];

  for(const word of weatherWords){

    if(text.includes(word)){

      result.weather = word;
      break;

    }

  }


  /* =========================================
     展示タイム
     
     直前情報の6艇を名前順に取得
  ========================================= */

  const timeMatches =
    [...text.matchAll(/(\d\.\d{2})\s+(?:-?\d+(?:\.\d+)?)/g)];


  /*
     公式ページでは
     
     選手名
     体重
     展示タイム
     チルト
     
     の順で並ぶため、
     選手名の出現位置から周辺を解析する。
  */

  const racerNames =
    [...text.matchAll(
      /\b\d\s+([^\d]+?)\s+\d{1,2}\.\dkg\s+(\d\.\d{2})\s+([+-]?\d+(?:\.\d+)?)/g
    )];


  for(let i=0;i<Math.min(6,racerNames.length);i++){

    result.boats.push({

      boat:i+1,

      exhibitionTime:
        toNumber(racerNames[i][2]),

      tilt:
        toNumber(racerNames[i][3])

    });

  }


  /* =========================================
     スタート展示
     
     Image
     1.06 2.13 3.03 ...
  ========================================= */

  const stSection =
    text.match(
      /コース並びST\s+([\s\S]+?)(?=水面気象情報|投票|レーススケジュール)/
    );


  if(stSection){

    const stText = stSection[1];

    const stMatches =
      [...stText.matchAll(
        /(\d)\s+(F?\.\d{2})/g
      )];

    stMatches.forEach(m=>{

      const boat =
        Number(m[1]);

      const value =
        m[2];

      const target =
        result.boats.find(
          x=>x.boat===boat
        );

      if(target){

        target.startExhibition =
          value;

      }

    });

  }


  return result;

}


/* =========================================
   Function本体
========================================= */

export default async(req)=>{

  try{

    const url =
      new URL(req.url);

    const date =
      url.searchParams.get("date");

    const venue =
      url.searchParams.get("venue");

    const race =
      url.searchParams.get("race");


    if(!date || !venue || !race){

      return new Response(

        JSON.stringify({

          success:false,

          error:
            "開催日・開催場・Rが必要です"

        }),

        {

          status:400,

          headers:{
            "Content-Type":
              "application/json; charset=utf-8"
          }

        }

      );

    }


    const jcd =
      VENUE_CODES[venue];


    if(!jcd){

      return new Response(

        JSON.stringify({

          success:false,

          error:
            `開催場「${venue}」が見つかりません`

        }),

        {

          status:400,

          headers:{
            "Content-Type":
              "application/json; charset=utf-8"
          }

        }

      );

    }


    const normalizedDate =
      date.replace(/-/g,"");


    /* =========================================
       出走表URL
    ========================================= */

    const racelistUrl =
      `https://www.boatrace.jp/owpc/pc/race/racelist` +
      `?hd=${normalizedDate}` +
      `&jcd=${jcd}` +
      `&rno=${race}`;


    /* =========================================
       直前情報URL
    ========================================= */

    const beforeUrl =
      `https://www.boatrace.jp/owpc/pc/race/beforeinfo` +
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


    /* =========================================
       2ページ同時取得
    ========================================= */

    const [
      raceResponse,
      beforeResponse
    ] = await Promise.all([

      fetch(racelistUrl,{headers}),

      fetch(beforeUrl,{headers})

    ]);


    if(!raceResponse.ok){

      throw new Error(
        `出走表取得失敗 HTTP ${raceResponse.status}`
      );

    }


    if(!beforeResponse.ok){

      throw new Error(
        `直前情報取得失敗 HTTP ${beforeResponse.status}`
      );

    }


    const raceHtml =
      await raceResponse.text();

    const beforeHtml =
      await beforeResponse.text();


    /* =========================================
       データ解析
    ========================================= */

    const boats =
      parseRacers(raceHtml);

    const before =
      parseBeforeInfo(beforeHtml);


    /* =========================================
       6艇データに直前情報を結合
    ========================================= */

    boats.forEach(boat=>{

      const extra =
        before.boats.find(
          x=>x.boat===boat.boat
        );

      if(!extra)
        return;


      boat.exhibitionTime =
        extra.exhibitionTime ?? null;

      boat.tilt =
        extra.tilt ?? null;

      boat.startExhibition =
        extra.startExhibition ?? null;

    });


    /* =========================================
       レースデータ
    ========================================= */

    const raceData = {

      venue,

      date:normalizedDate,

      race:Number(race),

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

      tide:null,

      boats,

      odds:{
        trifecta:[]
      }

    };


    return new Response(

      JSON.stringify({

        success:true,

        source:"BOAT RACE Official",

        race:raceData,

        url:{

          racelist:racelistUrl,

          beforeinfo:beforeUrl

        }

      },null,2),

      {

        status:200,

        headers:{

          "Content-Type":
            "application/json; charset=utf-8",

          "Cache-Control":
            "no-store"

        }

      }

    );


  }catch(error){

    return new Response(

      JSON.stringify({

        success:false,

        error:
          error?.message ||
          "Unknown error"

      }),

      {

        status:500,

        headers:{

          "Content-Type":
            "application/json; charset=utf-8"

        }

      }

    );

  }

};
