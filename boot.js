// সার্ভিস ওয়ার্কার (অফলাইনে অ্যাপ খোলা) + "হোম স্ক্রিনে যোগ করুন" বোতাম
(function(){
 if("serviceWorker" in navigator)window.addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})});
 var box=document.getElementById("drInst"),ev=null;
 var standalone=matchMedia("(display-mode: standalone)").matches||navigator.standalone;
 if(!box||standalone)return;
 addEventListener("beforeinstallprompt",function(e){e.preventDefault();ev=e;box.style.display="block";box.textContent="ফোনে অ্যাপ হিসেবে রাখুন ";var b=document.createElement("button");b.type="button";b.textContent="ইনস্টল";b.onclick=function(){ev.prompt();ev.userChoice.finally(function(){box.style.display="none";ev=null})};box.appendChild(b)});
 if(/iphone|ipad|ipod/i.test(navigator.userAgent)){box.style.display="block";box.textContent="আইফোনে: Safari-র শেয়ার বোতাম → “Add to Home Screen”"}
})();
