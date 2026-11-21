/**
 * Demo dataset — one afternoon at a Kampala shop.
 *
 * The arithmetic is fully reconciled:
 *   opening 850,000 + 600,500 in - 678,800 out = closing 771,700
 * which matches the final message exactly.
 *
 * Three messages are fake, each failing in a DIFFERENT way:
 *   #15  balance chain break (large) + no transaction ID
 *   #24  replayed transaction ID (arithmetic nearly right — the sneaky one)
 *   #28  typo + non-standard phrasing + balance chain break
 */
export const SAMPLE_SMS = [
  "09:02 You have received UGX 50,000 from JOHN MUKASA 256772001122. Financial Transaction Id: 412300001. Your new balance is UGX 900,000.",
  "09:14 You have sent UGX 20,000 to MARY NAKATO 256701234567. Fee: UGX 500. Tax: UGX 100. Financial Transaction Id: 412300002. Your new balance is UGX 879,400.",
  "09:31 You have received UGX 15,000 from SARAH ACHIRO 256780112233. Financial Transaction Id: 412300003. Your new balance is UGX 894,400.",
  "09:47 You have received UGX 120,000 from KAMPALA HARDWARE LTD 256752445566. Financial Transaction Id: 412300004. Your new balance is UGX 1,014,400.",
  "10:05 You have sent UGX 45,000 to PETER OKELLO 256782334455. Fee: UGX 900. Tax: UGX 180. Financial Transaction Id: 412300005. Your new balance is UGX 968,320.",
  "10:22 You have received UGX 8,000 from GRACE ATIM 256771223344. Financial Transaction Id: 412300006. Your new balance is UGX 976,320.",
  "10:40 You have withdrawn UGX 100,000 at AGENT 55021 KIKUUBO 256700445566. Fee: UGX 1,600. Tax: UGX 320. Financial Transaction Id: 412300007. Your new balance is UGX 874,400.",
  "11:03 You have received UGX 30,000 from DAVID SSEKANDI 256703344556. Financial Transaction Id: 412300008. Your new balance is UGX 904,400.",
  "11:19 You have sent UGX 12,000 to AIRTIME SELF. Fee: UGX 200. Tax: UGX 40. Financial Transaction Id: 412300009. Your new balance is UGX 892,160.",
  "11:44 You have received UGX 75,000 from NAKAWA GROCERS 256754112233. Financial Transaction Id: 412300010. Your new balance is UGX 967,160.",
  "12:01 You have sent UGX 60,000 to BETTY NAMUSOKE 256785566778. Fee: UGX 1,100. Tax: UGX 220. Financial Transaction Id: 412300011. Your new balance is UGX 905,840.",
  "12:18 You have received UGX 22,000 from RONALD KIGGUNDU 256776677889. Financial Transaction Id: 412300012. Your new balance is UGX 927,840.",
  "12:35 You have received UGX 5,000 from JOAN NABIRYE 256788899001. Financial Transaction Id: 412300013. Your new balance is UGX 932,840.",
  "13:02 You have sent UGX 150,000 to SUPPLIER UGANDA LTD 256759900112. Fee: UGX 2,300. Tax: UGX 460. Financial Transaction Id: 412300014. Your new balance is UGX 780,080.",
  "13:20 You have received UGX 180,000 from MUKASA ENTERPRISES. Your new balance is UGX 1,102,000.",
  "13:41 You have received UGX 40,000 from ALICE NAMBOOZE 256772334455. Financial Transaction Id: 412300015. Your new balance is UGX 820,080.",
  "13:58 You have sent UGX 25,000 to BODA RIDER 256784455667. Fee: UGX 600. Tax: UGX 120. Financial Transaction Id: 412300016. Your new balance is UGX 794,360.",
  "14:15 You have received UGX 90,000 from SSEBOWA TRADERS 256756677889. Financial Transaction Id: 412300017. Your new balance is UGX 884,360.",
  "14:33 You have received UGX 3,500 from MARGARET NAKIMULI 256789900122. Financial Transaction Id: 412300018. Your new balance is UGX 887,860.",
  "14:50 You have sent UGX 35,000 to HAMIDU SENTONGO 256771112233. Fee: UGX 800. Tax: UGX 160. Financial Transaction Id: 412300019. Your new balance is UGX 851,900.",
  "15:07 You have withdrawn UGX 200,000 at AGENT 41880 NAKAWA 256700667788. Fee: UGX 3,100. Tax: UGX 620. Financial Transaction Id: 412300020. Your new balance is UGX 648,180.",
  "15:24 You have received UGX 65,000 from GRACE ATIM 256771223344. Financial Transaction Id: 412300021. Your new balance is UGX 713,180.",
  "15:40 You have received UGX 10,000 from BRIAN ODONGO 256773445566. Financial Transaction Id: 412300022. Your new balance is UGX 723,180.",
  "15:52 You have received UGX 250,000 from KAMPALA HARDWARE LTD 256752445566. Financial Transaction Id: 412300004. Your new balance is UGX 1,023,180.",
  "16:03 You have sent UGX 18,000 to ESTHER KABATESI 256787788990. Fee: UGX 400. Tax: UGX 80. Financial Transaction Id: 412300023. Your new balance is UGX 704,700.",
  "16:21 You have received UGX 55,000 from NAKAWA GROCERS 256754112233. Financial Transaction Id: 412300024. Your new balance is UGX 759,700.",
  "16:44 You have received UGX 12,000 from PATRICK OCHIENG 256779900113. Financial Transaction Id: 412300025. Your new balance is UGX 771,700.",
  "16:50 You have recieved UGX 180,000 from MUKASA ENTERPRISES 256760011223. Your balance is now UGX 991,700.",
].join("\n");
