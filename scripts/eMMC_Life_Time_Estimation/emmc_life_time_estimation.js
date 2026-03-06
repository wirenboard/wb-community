/* 
* (c) 2025, Evgeniy (hexprof) Sitnikov
* v 2025.11.11
*/

var s_emmc_manfid = "";
var s_emmc_name = "";
var s_emmc_esta = "";
var s_emmc_estb = "";
var s_emmc_eol = "";
var b_emmc_esta = false;
var b_emmc_estb = false;
var b_emmc_eol = false;
var i_emmc_manfid = 0;
var st_emmc_name = "";

defineVirtualDevice("emmc2", {
  title: "Износ eMMC",
  cells: {
	id: {
        title: "eMMC",
	    type: "text",
	    value: "",
        readonly: true,
        order: 3,
	},
    esta: {
        title: "MLC",
        type: "alarm",
        value: false,
        order: 0,
    },
    estb: {
        title: "SLC",
        type: "alarm",
        value: false,
        order: 1,
    },
    eol: {
        title: "Pre EOL",
        type: "alarm",
        value: false,
        order: 2,
    },
  }
})
function est_str_perc(i_est) {
  var s_emmc_est;
  switch(i_est){
    case 0x00: {s_emmc_est = "0%-10%"; break;}
    case 0x01: {s_emmc_est = "0%-10%"; break;}
    case 0x02: {s_emmc_est = "10%-20%"; break;}
    case 0x03: {s_emmc_est = "20%-30%"; break;}
    case 0x04: {s_emmc_est = "30%-40%"; break;}
    case 0x05: {s_emmc_est = "40%-50%"; break;}
    case 0x06: {s_emmc_est = "50%-60%"; break;}
    case 0x07: {s_emmc_est = "60%-70%"; break;}
    case 0x08: {s_emmc_est = "70%-80%"; break;}
    case 0x09: {s_emmc_est = "80%-90%"; break;}
    case 0x0A: {s_emmc_est = "90%-100%"; break;}
    default: {s_emmc_est = "100%"; break;}
  }
  return s_emmc_est;
}

function est_bool(i_est) {
  if (i_est >= 0x06) return true;
  return false;
}

function emmc_start() {
      runShellCommand("cat /sys/block/mmcblk0/device/manfid", { captureOutput: true,
      exitCallback: function (exitCode, capturedOutput) {
        i_emmc_manfid = parseInt(capturedOutput, 16);
        var st_emmc_manfid = capturedOutput;
        switch(i_emmc_manfid){
          case 0x00: { s_emmc_manfid = "SanDisk"; break; };
          case 0x01: { s_emmc_manfid = "Cypress/SkHynix/SkyHigh"; break; };
          case 0x02: { s_emmc_manfid = "Kingston/SanDisk"; break; };
          case 0x03: { s_emmc_manfid = "Toshiba"; break; };
          case 0x11: { s_emmc_manfid = "Toshiba"; break; };
          case 0x13: { s_emmc_manfid = "Micron"; break; };
          case 0x15: { s_emmc_manfid = "Samsung/SanDisk/LG"; break; };
          case 0x2C: { s_emmc_manfid = "Kingston"; break; };
          case 0x37: { s_emmc_manfid = "KingMax"; break; };
          case 0x44: { s_emmc_manfid = "ATP"; break; };
          case 0x45: { s_emmc_manfid = "SanDisk"; break; };
          case 0x52: { s_emmc_manfid = "Alliance"; break; };
          case 0x70: { s_emmc_manfid = "Kingston"; break; };
          case 0x88: { s_emmc_manfid = "FORESEE/Longsys"; break; };
          case 0x90: { s_emmc_manfid = "SkHynix"; break; };
          case 0xAD: { s_emmc_manfid = "Xincun"; break; };
          case 0xD6: { s_emmc_manfid = "FORESEE/Longsys"; break; };
          case 0xE5: { s_emmc_manfid = "Dosilicon"; break; };
          case 0xEA: { s_emmc_manfid = "Zetta/MKFounder"; break; };
          case 0xEC: { s_emmc_manfid = "Rayson"; break; };
          case 0xF2: { s_emmc_manfid = "JSC"; break; };
          case 0xFE: { s_emmc_manfid = "Micron"; break; };
          default: {s_emmc_manfid = "UNKNOWN"; break;}
        }
         s_emmc_manfid = st_emmc_manfid + " " + s_emmc_manfid;
      },
    }); 
    runShellCommand("cat /sys/class/block/mmcblk0/device/life_time", { captureOutput: true,
      exitCallback: function (exitCode, capturedOutput) {
        log(capturedOutput);
        var s_emmc_est = capturedOutput.split(" ");
        log(s_emmc_est)
        var i_emmc_esta = parseInt(s_emmc_est[0], 16);
        s_emmc_esta = est_str_perc(i_emmc_esta);
        b_emmc_esta = est_bool(i_emmc_esta);
        var i_emmc_estb = parseInt(s_emmc_est[1], 16);
        s_emmc_estb = est_str_perc(i_emmc_estb);
        b_emmc_estb = est_bool(i_emmc_estb);
      },
    });
  
    runShellCommand("cat /sys/class/block/mmcblk0/device/pre_eol_info", { captureOutput: true,
      exitCallback: function (exitCode, capturedOutput) {
        var i_emmc_eol = parseInt(capturedOutput, 16);    
        switch(i_emmc_eol){
          case 0x00: {s_emmc_eol = "Отлично: 0% резервных блоков"; break; b_emmc_eol = false;}
          case 0x01: {s_emmc_eol = "Нормально: менее 80% резервных блоков"; break; b_emmc_eol = false; break;}
          case 0x02: {s_emmc_eol = "Опасно: 80% резервных блоков"; break; b_emmc_eol = true; break;}
          case 0x03: {s_emmc_eol = "Очень опасно: 90% резервных блоков"; break; b_emmc_eol = true; break;}
          default: {s_emmc_estb = "Фатально: 100% резервных блоков"; break; b_emmc_eol = true;}
        }
      },
    });
  runShellCommand("cat /sys/block/mmcblk0/device/name", { captureOutput: true, exitCallback: function (exitCode, capturedOutput) { s_emmc_name = capturedOutput.toString().trim(); } });

  if((s_emmc_manfid == "") || (s_emmc_name == "") || (s_emmc_manfid == null) || (s_emmc_name == null)) {
    dev["emmc2/id"] = "Not ready";
    dev["emmc2/id#error"] = "notready";
  }
  else{
    var s_res_emmc_name;
    if((i_emmc_manfid == 0x00) && (s_emmc_name == "000000")) { s_res_emmc_name = "Unknown";}

    // Toshiba
    else if ((i_emmc_manfid == 0x11) && (s_emmc_name == "008G70")) { s_res_emmc_name = "Toshiba THGBMFG6C1LBAIL";}
    else if ((i_emmc_manfid == 0x11) && (s_emmc_name == "008GB0")) { s_res_emmc_name = "Toshiba THGBMJG6C1LBAIL";}

    // Micron
    else if ((i_emmc_manfid == 0x13) && (s_emmc_name == "R1J55A")) { s_res_emmc_name = "Micron MTFC8GACAENS";}
    else if ((i_emmc_manfid == 0x13) && (s_emmc_name == "R1J56L")) { s_res_emmc_name = "Micron MTFC16GAKAECN";}
    else if ((i_emmc_manfid == 0x13) && (s_emmc_name == "R1J57L")) { s_res_emmc_name = "Micron MTFC32GAKAECN";}
    else if ((i_emmc_manfid == 0x13) && (s_emmc_name == "R1J58E")) { s_res_emmc_name = "Micron MTFC64GAJAEDN";}
    else if ((i_emmc_manfid == 0x13) && (s_emmc_name == "R1J59E")) { s_res_emmc_name = "Micron MTFC128GAJAEDN";}
    else if ((i_emmc_manfid == 0x13) && (s_emmc_name == "Q2J55L")) { s_res_emmc_name = "Micron MTFC8GAKAJCN-1M";}

    // Samsung
    else if ((i_emmc_manfid == 0x15) && (s_emmc_name == "AJTD4R")) { s_res_emmc_name = "Samsung KLMAG1JETD-B041";}
    else if ((i_emmc_manfid == 0x15) && (s_emmc_name == "CJTD4R")) { s_res_emmc_name = "Samsung KLMCG4JETD-B041";}
    else if ((i_emmc_manfid == 0x15) && (s_emmc_name == "M1G1CC")) { s_res_emmc_name = "Samsung KLM1G1CEHC-B101";}
    else if ((i_emmc_manfid == 0x15) && (s_emmc_name == "M2G1DE")) { s_res_emmc_name = "Samsung KLM2G1DEHE-B101";}
    else if ((i_emmc_manfid == 0x15) && (s_emmc_name == "M8G1DE")) { s_res_emmc_name = "Samsung KLM8G4DEHE-B101";}
    else if ((i_emmc_manfid == 0x15) && (s_emmc_name == "MAG1DE")) { s_res_emmc_name = "Samsung KLMAG8DEHE-A101";}

    // SanDisk
    else if ((i_emmc_manfid == 0x45) && (s_emmc_name == "DG4008")) { s_res_emmc_name = "SanDisk iNAND 7250 SDINBDG4-8G";}
    else if ((i_emmc_manfid == 0x45) && (s_emmc_name == "DG4016")) { s_res_emmc_name = "SanDisk iNAND 7250 SDINBDG4-16G";}
    else if ((i_emmc_manfid == 0x45) && (s_emmc_name == "DG4032")) { s_res_emmc_name = "SanDisk iNAND 7250 SDINBDG4-32G";}
    else if ((i_emmc_manfid == 0x45) && (s_emmc_name == "DG4064")) { s_res_emmc_name = "SanDisk iNAND 7250 SDINBDG4-64G";}

    // Alliance
    else if ((i_emmc_manfid == 0x52) && (s_emmc_name == "AS08FC")) { s_res_emmc_name = "Alliance ASFC8G31M-51BIN";}

    // Kingston
    else if ((i_emmc_manfid == 0x70) && (s_emmc_name == "IX2932")) { s_res_emmc_name = "Kingston EMMC32G-IX29-8AC01";}
    else if ((i_emmc_manfid == 0x70) && (s_emmc_name == "IX2964")) { s_res_emmc_name = "Kingston EMMC64G-IX29-8AC01";}
    else if ((i_emmc_manfid == 0x70) && (s_emmc_name == "IX9128")) { s_res_emmc_name = "Kingston EMMC128-IX29-8AC01";}
    else if ((i_emmc_manfid == 0x70) && (s_emmc_name == "MT3204")) { s_res_emmc_name = "Kingston EMMC04G-MT32-01G00";}
    else if ((i_emmc_manfid == 0x70) && (s_emmc_name == "WT3204")) { s_res_emmc_name = "Kingston EMMC04G-WT32-01G10";}
    else if ((i_emmc_manfid == 0x70) && (s_emmc_name == "W62704")) { s_res_emmc_name = "Kingston EMMC04G-W627-X03U";}

    // FORESEE/Longsys
    else if ((i_emmc_manfid == 0x88) && (s_emmc_name == "88A19B")) { s_res_emmc_name = "Foresee FEMDRW032G-88A19";}
    else if ((i_emmc_manfid == 0x88) && (s_emmc_name == "88A19C")) { s_res_emmc_name = "Foresee FEMDRW064G-88A19";}
    else if ((i_emmc_manfid == 0x88) && (s_emmc_name == "88A19D")) { s_res_emmc_name = "Foresee FEMDRW128G-88A19";}
    else if ((i_emmc_manfid == 0x88) && (s_emmc_name == "SLD32G")) { s_res_emmc_name = "FORESEE/Longsys FSEIASLD-32G";}
    else if ((i_emmc_manfid == 0x88) && (s_emmc_name == "SLD64G")) { s_res_emmc_name = "FORESEE/Longsys FSEIASLD-64G";}
    else if ((i_emmc_manfid == 0x88) && (s_emmc_name == "SLD128")) { s_res_emmc_name = "FORESEE/Longsys FSEIASLD-128G";}

    // Hynix
    else if ((i_emmc_manfid == 0x90) && (s_emmc_name == "H4G1d")) { s_res_emmc_name = "Hynix H26M31003GPR";}
    else if ((i_emmc_manfid == 0x90) && (s_emmc_name == "HAG2e")) { s_res_emmc_name = "Hynix H26M52003EQR";}
    else if ((i_emmc_manfid == 0x90) && (s_emmc_name == "H8G4a2")) { s_res_emmc_name = "Hynix H26M41208HPR";}
    else if ((i_emmc_manfid == 0x90) && (s_emmc_name == "HAG4a2")) { s_res_emmc_name = "Hynix H26M52208FPR";}
    else if ((i_emmc_manfid == 0x90) && (s_emmc_name == "HBG4a2")) { s_res_emmc_name = "Hynix H26M64208EMR";}
    else if ((i_emmc_manfid == 0x90) && (s_emmc_name == "HCG4a2")) { s_res_emmc_name = "Hynix H26M78208CMR";}

    // Rayson
    else if ((i_emmc_manfid == 0xAC) && (s_emmc_name == "AT2S")) { s_res_emmc_name = "Rayson RS70B04G4S03F";}

    // Macronix
    else if ((i_emmc_manfid == 0xC2) && (s_emmc_name == "M02B12")) { s_res_emmc_name = "Macronix MX52ML02B12";}
    else if ((i_emmc_manfid == 0xC2) && (s_emmc_name == "M02A11")) { s_res_emmc_name = "Macronix MX52ML02B11";}
    else if ((i_emmc_manfid == 0xC2) && (s_emmc_name == "M04A11")) { s_res_emmc_name = "Macronix MX52ML04A11";}
    else if ((i_emmc_manfid == 0xC2) && (s_emmc_name == "M08A11")) { s_res_emmc_name = "Macronix MX52ML08A11";}

    // FORESEE/Longsys
    else if ((i_emmc_manfid == 0xD6) && (s_emmc_name == "58A43A")) { s_res_emmc_name = "Foresee FEMDRM016G-58A43";}
    else if ((i_emmc_manfid == 0xD6) && (s_emmc_name == "88A398")) { s_res_emmc_name = "Foresee FEMDMW008G-88A39";}

    // Dosilicon
    else if ((i_emmc_manfid == 0xE5) && (s_emmc_name == "03E008")) { s_res_emmc_name = "Dosilicon DS55B08D5A2-EA";}
    else if ((i_emmc_manfid == 0xE5) && (s_emmc_name == "03E032")) { s_res_emmc_name = "Dosilicon DS55B32D5A1-EA";}
    else if ((i_emmc_manfid == 0xE5) && (s_emmc_name == "03E064")) { s_res_emmc_name = "Dosilicon DS55B64D5A1-EA";}

    // Zetta/MKFounder
    else if ((i_emmc_manfid == 0xEA) && (s_emmc_name == "SPeMMC")) { s_res_emmc_name = "Zetta ZDEMMC0xGA";}
    else if ((i_emmc_manfid == 0xEA) && (s_emmc_name == "911000")) { s_res_emmc_name = "MKFounder MKEV016GIB-OY500";}

    // JSC
    else if ((i_emmc_manfid == 0xF2) && (s_emmc_name == "JS08AC")) { s_res_emmc_name = "JSC JSMC08AUM1ASAEA-H5-SU";}

    // Micron
    else if ((i_emmc_manfid == 0xFE) && (s_emmc_name == "MMC02G")) { s_res_emmc_name = "Micron MTFC2GMDEA-0M WT";}
    else if ((i_emmc_manfid == 0xFE) && (s_emmc_name == "MMC04G")) { s_res_emmc_name = "Micron MTFC4GMDEA-1M WT";}
    else if ((i_emmc_manfid == 0xFE) && (s_emmc_name == "MMC08G")) { s_res_emmc_name = "Micron MTFC8GLDEA-1M WT";}
    else if ((i_emmc_manfid == 0xFE) && (s_emmc_name == "MMC16G")) { s_res_emmc_name = "Micron MTFC16GJDEC-2M WT";}
    else if ((i_emmc_manfid == 0xFE) && (s_emmc_name == "MMC32G")) { s_res_emmc_name = "Micron MTFC32GJDED-3M WT";}
    else if ((i_emmc_manfid == 0xFE) && (s_emmc_name == "MMC64G")) { s_res_emmc_name = "Micron MTFC64GJDDN-3M WT";}

    else { s_res_emmc_name = s_emmc_manfid + " " + s_emmc_name;}
    
    dev["emmc2/id"] = s_res_emmc_name;
    dev["emmc2/id#error"] = "";
  }
  if((s_emmc_esta == "") || (s_emmc_esta == null)){
    getControl("emmc2/esta").setTitle(s_emmc_esta + " Not ready");
    dev["emmc2/esta#error"] = "notready";
  } 
  else{
    getControl("emmc2/esta").setTitle(s_emmc_esta + " износ раздела данных MLC");
    dev["emmc2/esta"] = b_emmc_esta;
    dev["emmc2/esta#error"] = "";
  }
  if((s_emmc_estb == "") || (s_emmc_estb == null)){
    getControl("emmc2/estb").setTitle("Не готов");
    dev["emmc2/estb#error"] = "notready";
  } 
  else{
    getControl("emmc2/estb").setTitle(s_emmc_estb + " износ загрузочного раздела SLC");
    dev["emmc2/estb"] = b_emmc_estb;
    dev["emmc2/estb#error"] = "";
  }
  if((s_emmc_eol == "") || (s_emmc_eol == null)){
    getControl("emmc2/eol").setTitle("Не готов");
    dev["emmc2/eol#error"] = "notready";
  } 
  else{
    getControl("emmc2/eol").setTitle(s_emmc_eol);
    dev["emmc2/eol"] = b_emmc_eol;
    dev["emmc2/eol#error"] = "";
  }
}

dev["emmc2/id#error"] = "notready";
dev["emmc2/esta#error"] = "notready";
dev["emmc2/estb#error"] = "notready";
dev["emmc2/eol#error"] = "notready";

var vemmc2_cron1s = defineRule("emmc2_cron1s", {
  when: cron("@every 1s"),
  then: function () {    
    emmc_start();
    if((dev["emmc2/id#error"] == "") && (dev["emmc2/esta#error"] == "") && (dev["emmc2/estb#error"] == "") && (dev["emmc2/eol#error"] == "")){
      disableRule(vemmc2_cron1s);
    }
  },
})
var vemmc2_cron12h = defineRule("emmc2_cron12h", {
  when: cron("@every 12h"),
  then: function () {    
    emmc_start();
  },
})
