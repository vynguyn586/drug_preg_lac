// ======================================================
// GOOGLE SHEET CSV URL
// ======================================================


const SHEET_URL =
"https://docs.google.com/spreadsheets/d/e/2PACX-1vRFEzfSeK3z3bVDJGGzDbWTWe8SwnCMMtGyaPLSF0rcvSXgPEoTquIXGWgQGeMEsg/pub?gid=94806634&single=true&output=csv";




// ======================================================
// BIẾN TOÀN CỤC
// ======================================================


let drugs = [];

let currentDrug = null;





// ======================================================
// LOAD GOOGLE SHEET
// ======================================================


Papa.parse(SHEET_URL, {


download:true,

header:true,

skipEmptyLines:true,


complete:function(result){


    drugs = result.data.filter(row => 
        row["Hoạt chất"]
    );


    renderDrugList(drugs);


}



});






// ======================================================
// HIỂN THỊ DANH SÁCH HOẠT CHẤT
// ======================================================


function renderDrugList(data){


const container =
document.getElementById("drugContainer");


container.innerHTML="";



if(data.length===0){


container.innerHTML=
`
<p>
Không tìm thấy hoạt chất
</p>
`;

return;


}




data.forEach(drug=>{


const card=document.createElement("div");


card.className="drug-card";



card.onclick=function(){


openDrug(drug);


};




card.innerHTML=`

<h3 class="drug-name">

${drug["Hoạt chất"]}

</h3>


<div class="category">

${drug["Nhóm thuốc"] || "Chưa phân loại"}

</div>



<div class="recommend">

${drug["Khuyến cáo đối với PNMT"] || ""}

</div>


`;



container.appendChild(card);



});



}







// ======================================================
// TÌM KIẾM HOẠT CHẤT
// ======================================================


document
.getElementById("searchInput")
.addEventListener(
"input",
function(){



let keyword =
removeVietnameseAccent(
this.value.toLowerCase()
);



let filtered =
drugs.filter(drug=>{


let name =
removeVietnameseAccent(
(drug["Hoạt chất"] || "")
.toLowerCase()
);



return name.includes(keyword);



});



renderDrugList(filtered);



});








// ======================================================
// MỞ TRANG CHI TIẾT
// ======================================================


function openDrug(drug){


currentDrug=drug;



document
.getElementById("homePage")
.classList.add("hidden");



document
.getElementById("detailPage")
.classList.remove("hidden");




window.location.hash =
"drug/" +
encodeURIComponent(
drug["Hoạt chất"]
);



renderDetail(drug);



}







// ======================================================
// HIỂN THỊ CHI TIẾT
// ======================================================


function renderDetail(drug){



const detail =
document.getElementById("drugDetail");



detail.innerHTML=`

<h1 class="detail-title">

${drug["Hoạt chất"]}

</h1>



<div class="detail-category">

${drug["Nhóm thuốc"] || ""}

</div>





<div 
class="info-box pregnancy"
style="
background:${drug["Mã màu PNMT"] || "#c9f7c9"};
">


<h3>

Khuyến cáo đối với phụ nữ mang thai

</h3>


<div class="content">

${formatText(
drug["Khuyến cáo đối với PNMT"]
)}

</div>


</div>







<div class="info-box note">


<h3>

Lưu ý chi tiết khi lựa chọn thuốc cho phụ nữ mang thai

</h3>


<div class="content">

${formatText(
drug["Chú thích PNMT"]
)}

</div>


</div>






<div class="info-box reference">


<h3>

Tài liệu tham khảo 1

</h3>


<div class="content">

${formatText(
drug["Tài liệu tham khảo PNMT"]
)}

</div>


</div>







<div 
class="info-box lactation"
style="
background:${drug["Mã màu PNCCB"] || "#c9f7c9"};
">


<h3>

Khuyến cáo đối với phụ nữ cho con bú

</h3>


<div class="content">

${formatText(
drug["Khuyến cáo đối với PNCCB"]
)}

</div>


</div>







<div class="info-box note">


<h3>

Lưu ý chi tiết khi lựa chọn thuốc cho phụ nữ cho con bú

</h3>


<div class="content">

${formatText(
drug["Chú thích PNCCB"]
)}

</div>


</div>






<div class="info-box reference">


<h3>

Tài liệu tham khảo 2

</h3>


<div class="content">

${formatText(
drug["Tài liệu tham khảo PNCCB"]
)}

</div>


</div>


`;



}







// ======================================================
// QUAY VỀ TRANG DANH SÁCH
// ======================================================


function goHome(){



document
.getElementById("detailPage")
.classList.add("hidden");



document
.getElementById("homePage")
.classList.remove("hidden");



window.location.hash="";



}







// ======================================================
// XỬ LÝ XUỐNG DÒNG + LINK
// ======================================================


function formatText(text){


if(!text)
return "";



text=text.replace(
/(https?:\/\/[^\s]+)/g,

'<a href="$1" target="_blank">$1</a>'
);



return text;


}







// ======================================================
// BỎ DẤU TIẾNG VIỆT
// ======================================================


function removeVietnameseAccent(str){



return str
.normalize("NFD")
.replace(
/[\u0300-\u036f]/g,
""
)
.replace(/đ/g,"d")
.replace(/Đ/g,"D");


}






// ======================================================
// LOAD TRỰC TIẾP QUA URL
// ======================================================


window.addEventListener(
"load",
()=>{


let hash =
window.location.hash;



if(hash.startsWith("#/drug/")){


let name =
decodeURIComponent(
hash.replace("#/drug/","")
);



let found =
drugs.find(
d =>
d["Hoạt chất"]===name
);



if(found){

openDrug(found);

}


}



});