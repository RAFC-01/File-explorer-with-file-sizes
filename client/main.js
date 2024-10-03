let userDrives;
let inAction = false;

const fileViewListDiv = document.getElementById('fileViewList');
const fileDirTextDiv = document.getElementById('pathText');
const sizeProgressDiv = document.getElementById('calculationProcentage');
const nav_back = document.getElementById('nav_back');
const nav_forth = document.getElementById('nav_forth');
const popUpDiv = document.getElementById('leftClickPopUp');

const history = [];
let historyPos = 0;

const raportFileName = 'raport.json';

const MB = 1_000_000;
const GB = 1_000_000_000;

let top10Largest = [];

let raport;

async function readDirFrom(dirPath = '', index){
  if (inAction) {
    console.log('busy...');
    return
  };
  fileDirTextDiv.innerHTML = dirPath;
  let files = await window.electronAPI.readDir(dirPath);
  if (index === undefined){
    history.push(dirPath);
    historyPos = history.length - 1;
  }else{
    historyPos = index;
  }
  if (historyPos > 0){
    nav_back.style.backgroundImage = 'url(arrow.png)';
  }else{
    nav_back.style.backgroundImage = 'url(arrow-dark.png)';
  }
  if (historyPos < history.length - 1){
    nav_forth.style.backgroundImage = 'url(arrow.png)';
  }else{
    nav_forth.style.backgroundImage = 'url(arrow-dark.png)';
  }
  await renderFileList(files, dirPath);
}

nav_back.addEventListener('click', ()=>{
  let newPos = historyPos - 1;
  if (history[newPos]) readDirFrom(history[newPos], newPos);
});
nav_forth.addEventListener('click', ()=>{
  let newPos = historyPos + 1;
  if (history[newPos]) readDirFrom(history[newPos], newPos);
});
popUpDiv.addEventListener('click', () => {
  let path = popUpDiv.dataset.path;
  window.electronAPI.openFolderInExplorer(path);
  popUpDiv.style.display = 'none';
});


let folderBitmap;

// Usage example: writing to a file named 'example.txt' with some content

async function createFolderBitmap(){
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');

  let img = new Image();
  img.src = 'Folder.png';  
  
  await new Promise(resolve => {
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
  
      folderBitmap = ctx.getImageData(0, 0, canvas.width, canvas.height);
      resolve();
    }
  })
}

const generatedFolderIcons = {};

function sortDivs(){
  const parent = fileViewListDiv;
  const items = Array.from(parent.children);
  items.sort((a, b) => b.dataset.rawSize - a.dataset.rawSize);

  // Re-append sorted items back to the parent
  items.forEach(item => parent.appendChild(item));
}

function getFileIcon(color = '#ffe894'){
  if (generatedFolderIcons[color]) return generatedFolderIcons[color];
  let rgba = HEXtoRGB(color);
  let canvas = document.createElement('canvas');
  let ctx = canvas.getContext('2d');
  canvas.width = folderBitmap.width;
  canvas.height = folderBitmap.height;
  let imageData = ctx.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < folderBitmap.data.length; i+= 4){
    let color = folderBitmap.data;
    if (color[i+3] == 0) continue;
    else {
      imageData.data[i] = rgba[0];
      imageData.data[i+1] = rgba[1];
      imageData.data[i+2] = rgba[2];
      imageData.data[i+3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);

  let canvasImage = canvas.toDataURL();

  generatedFolderIcons[color] = canvasImage;
  return canvasImage;
}
function HEXtoRGB(hex){
  let alpha = false,
  h = hex.slice(hex.startsWith('#') ? 1 : 0);
  if (h.length === 3) h = [...h].map(x => x + x).join('');
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);

  let r = (h >>> (alpha ? 24 : 16));
  let g = ((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8));
  let b = ((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0));
  let a = (alpha ? h & 0x000000ff : 255);
  return [r, g, b, a];
}

function getByteColor(bytes){
  if (bytes == 0) return '#aaaaaa';
  if (bytes < 100 * MB) return '#247530';
  if (bytes < GB) return '#835933';
  if (bytes < 5 * GB) return '#ffe894'; // default color
  if (bytes < 10 * GB) return '#6b3308';
  return '#881a0b';
}

function getByteSizeString(byteSize){
  if (!byteSize) return false;
  if (byteSize < 1000) return byteSize + ' B';
  else if (byteSize < MB) return (Math.floor(byteSize) / 1000) + ' KB';
  else if (byteSize < GB) return (Math.floor(byteSize / 1000) / 1000 ) + ' MB';
  else return (Math.floor(byteSize / MB) / 1000 ) + ' GB';
}

async function renderFileList(list = [], dirPath){
  fileViewListDiv.innerHTML = '';
  console.log(list);
  const folderList = [];
  for (let i = 0; i < list.length; ++i){
    let item = list[i].name;
    let div = document.createElement('div');
    try{

      const {itemPath, stats, isDir} = await window.electronAPI.getItemStats({dirPath, item});
      let isDirectory = isDir;
  
      let modData = stats.mtime;
  
      let size = getByteSizeString(stats.size);
  
      let byteSize = stats.size;

      let sizeColor;
  
      if (byteSize > MB) sizeColor = '#ff0000';
  
      let sizeString = size || 'waiting...';
  
      let day = modData.getDate() < 10 ? '0'+modData.getDate() : modData.getDate(); 
      let month = modData.getMonth() + 1 < 10 ? '0'+ (modData.getMonth() + 1) : modData.getMonth() + 1; 
      let hour = modData.getHours() < 10 ? '0'+ modData.getHours() : modData.getHours();
      let minutes = modData.getMinutes() < 10 ? '0' + modData.getMinutes() : modData.getMinutes();
  
      let modDateString = `${day}/${month}/${modData.getFullYear()} ${hour}:${minutes}`;
  
      let fileIcon = isDirectory ? `<img src='${getFileIcon(sizeColor)}' width='100%' height='100%'>` : '';
  
      if (isDirectory){
        folderList.push({path: itemPath, index: i});
        div.addEventListener('click', () => {
          if (popUpDiv.style.display == 'block'){
            popUpDiv.style.display = 'none';
          }else{
            readDirFrom(itemPath);
          }
        });
      } 
      div.addEventListener('contextmenu', (e) => {
        let divPos = div.getClientRects()[0];
        popUpDiv.style.display = 'block';
        popUpDiv.style.left = e.clientX + 'px';
        popUpDiv.style.top = divPos.top + 'px';
        popUpDiv.dataset.path = itemPath;
      });

      
      div.className = 'fileItem';
      div.dataset.rawDate = new Date(modData).getTime();
      div.dataset.rawSize = byteSize; 
      div.dataset.index = i;
      div.innerHTML = `<div class='fileName fileStat'>
        <div class='fileIcon'>${fileIcon}</div>
        ${item}
      </div>
      <div class='fileMod fileStat'>${modDateString}</div>
      <div class='fileSize fileStat'>${sizeString}</div>
      `;
      
      fileViewListDiv.append(div);
    }catch(err){
      // console.log(err);
    }
  }

  calculateFoldersSize(folderList)
}

async function calculateFoldersSize(list){
  inAction = true;
  sizeProgressDiv.innerText = `0 / ${list.length} 0%`;
  for (let i = 0; i < list.length; i++){
    let folderDivSizeText = document.querySelector(`.fileItem[data-index='${list[i].index}'] > .fileSize`);
    let folderDivIcon = document.querySelector(`.fileItem[data-index='${list[i].index}'] > .fileName > .fileIcon`);
    let folderDiv = document.querySelector(`.fileItem[data-index='${list[i].index}']`);

    console.log(list[i].index);
    folderDivSizeText.innerHTML = `<div class='bar_back'>
      <div class='bar_text'><div>Calculating...</div></div>
    </div>`

    // let dirSize = await calculateDirSize(list[i].path, list[i].index);
    let data = await window.electronAPI.calculateDirSizes({raport, dirPath: list[i].path});
    let dirSize = data.totalSize;
    if (data.raport) raport = data.raport;
    else console.error('no raport'); 

    folderDivIcon.innerHTML = `<img src='${getFileIcon(getByteColor(dirSize))}' width='100%' height='100%'>`;
    folderDivSizeText.innerText = getByteSizeString(dirSize) || '0 B';
    sizeProgressDiv.innerText = `${i+1} / ${list.length} ${Math.floor((i+1) / list.length * 100)}%`;
    folderDiv.dataset.rawSize = dirSize;
  
    sortDivs();
  }
  inAction = false;
}

function getRaportIntoTop10(){
  let array = Object.keys(raport);
  array.sort((a, b) => raport[b].size - raport[a].size);
  for (let i = 0; i < 10; i++){
    if (top10Largest.length == 10 && array[i] > top10Largest){
      top10Largest[9] = {size: raport[array[i]].size, path: array[i]};
      top10Largest.sort((a, b) => b.size - a.size);
    }else{
      top10Largest.push({size: raport[array[i]].size, path: array[i]});
      top10Largest.sort((a, b) => b.size - a.size);
    }
  }
}

async function calculateDirSize(dirPath, index) {
  let totalSize = 0;
  let folderDivSizeText = document.querySelector(`.fileItem[data-index='${index}'] > .fileSize > .bar_back > .bar_text`);
  async function calculateSize(currentPath) {
    // Read all items in the current directory
    if (folderDivSizeText) folderDivSizeText.innerText = getByteSizeString(totalSize) + '...';
    let dirSize = 0;
    try{
      
      const folderModData = (await window.electronAPI.getStats(currentPath)).mtimeMs;
      
      if (raport[currentPath] && raport[currentPath].modData == folderModData) {
        totalSize += raport[currentPath].size;
        return raport[currentPath].size
      }

      const items = await window.electronAPI.readDir(currentPath);

      for (const item of items) {
        const {itemPath, stats, isDir} = await window.electronAPI.getItemStats({dirPath: currentPath, item: item.name});
        // Check if the item is a directory or a file
        if (isDir) {
          // Recursively calculate the size of the subdirectory
          let size = await calculateSize(itemPath);
          dirSize+=size;
        } else if (stats && stats.size){
          // Get the file stats and add its size to the total
          totalSize += stats.size;
          dirSize+=stats.size;
        }
      }
      if (dirSize > MB * 10){
        raport[currentPath] = {modData: folderModData, size: dirSize};
        if (top10Largest.length < 10) top10Largest.push({path: currentPath, size: dirSize, smallBrain: getByteSizeString(dirSize)});
        else {
          top10Largest.sort((a ,b) => b.size - a.size);
          if (top10Largest[9].size < dirSize) top10Largest[9] = {path: currentPath, size: dirSize, smallBrain: getByteSizeString(dirSize)};
          top10Largest.sort((a ,b) => b.size - a.size);
        }
      }
    }catch(err){
      // console.error(err)
    }
    return dirSize;
    // console.log(dirSize, currentPath);
  }

  // Start calculating from the provided directory path
  await calculateSize(dirPath);

  return totalSize;
}
// renderer.js
const dropArea = document.querySelector('body');

// Prevent default drag behaviors
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, (e) => e.preventDefault(), false);
});

// Highlight drop area when file is dragged over
['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
});

['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
});

// Handle dropped files
dropArea.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;

  for (const file of files) {
    console.log('File Path:', file.path); // This will log the path of the dragged file
  }
});
async function loadExplorer(){
  await createFolderBitmap();
  // userDrives = await getUserDrives();
  raport = await window.electronAPI.readRaport();
  if (!raport) raport = {};
  console.log(userDrives)
  readDirFrom('C:/');
}
function getUserDrives() {
  return new Promise((resolve, reject) => {
    let command;

    if (os.platform() === 'win32') {
      // Windows command to list drives
      command = 'wmic logicaldisk get name';
    } else if (os.platform() === 'darwin') {
      // macOS command to list drives
      command = 'df -H | awk \'/^[^ ]/{print $1}\'';
    } else {
      // Linux command to list drives
      command = 'lsblk -d -n -p -o NAME';
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(`Error: ${stderr || error.message}`);
      }

      const drives = stdout.split('\n').filter(drive => drive.trim());
      resolve(drives);
    });
  });
}
loadExplorer();

window.addEventListener('beforeunload', async (e) => {
  await window.electronAPI.writeRaport(raport);
});