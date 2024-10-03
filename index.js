const { app, BrowserWindow, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const devMode = false;
const MB = 1_000_000;
const GB = 1_000_000_000;


if (devMode) require('electron-reload')(__dirname);

const raportFilePath = path.join(app.getPath('userData'), 'raport.json');

// Function to read the raport.json file
function readRaportFile() {
  try {
    if (fs.existsSync(raportFilePath)) {
      const data = fs.readFileSync(raportFilePath, 'utf8');
      return JSON.parse(data);
    } else {
      return {}; // Return an empty object if the file does not exist
    }
  } catch (error) {
    console.error('Error reading raport.json:', error);
    return {};
  }
}

// Function to write to the raport.json file
function writeRaportFile(raportData) {
  try {
    fs.writeFileSync(raportFilePath, JSON.stringify(raportData, null, 2), 'utf8');
    console.log('raport.json updated successfully.');
  } catch (error) {
    console.error('Error writing to raport.json:', error);
  }
}
function openFolderInExplorer(path){
    shell.showItemInFolder(path);
}

async function readDir(path){
  
  return await fs.promises.readdir(path, {withFileTypes: true});
}
async function getStats(path){
  return await fs.promises.stat(path);
}
async function getItemStats(data){
  let itemPath = path.join(data.dirPath, data.item);

  let stats;
  let isDir;

  try{
    // stats = fs.statSync(itemPath);
    stats = await fs.promises.stat(itemPath);
    isDir = stats.isDirectory();

    return {itemPath, stats, isDir}
  }catch(err){
    return {itemPath, stats, isDir}
  }

}
async function calculateDirSizes(raport, dirPath = ''){
  let totalSize = 0;
  if (raport[dirPath]){
    const folderModData = (await fs.promises.stat(dirPath)).mtimeMs;
    if (raport[dirPath].modData == folderModData){
      return {totalSize: raport[dirPath].size, raport: raport};
    }
  }
  async function calculateSize(currentPath) {
    // Read all items in the current directory
    let dirSize = 0;
    try{
      
      const folderModData = (await fs.promises.stat(currentPath)).mtimeMs;
      
      if (raport[currentPath]){ 
        if (raport[currentPath].modData == folderModData){
          totalSize += raport[currentPath].size;
          return raport[currentPath].size
        }
      }

      const items = await fs.promises.readdir(currentPath, {withFileTypes: true});

      for (const item of items) {
        const itemPath = path.join(currentPath, item.name);
        // const {itemPath, stats, isDir} = await window.electronAPI.getItemStats({dirPath: currentPath, item: item.name});
        // Check if the item is a directory or a file
        if (item.isDirectory()) {
          // Recursively calculate the size of the subdirectory
          let size = await calculateSize(itemPath);
          dirSize+=size;
        } else if (item.isFile()){
          // Get the file stats and add its size to the total
          try{
            const stats = await fs.promises.stat(itemPath);
            totalSize += stats.size;
            dirSize+=stats.size;
          }catch(err){
            console.error(err);
          }
        }
      }
      if (dirSize > MB * 10){
        raport[currentPath] = {modData: folderModData, size: dirSize};

        // if (top10Largest.length < 10) top10Largest.push({path: currentPath, size: dirSize, smallBrain: getByteSizeString(dirSize)});
        // else {
        //   top10Largest.sort((a ,b) => b.size - a.size);
        //   if (top10Largest[9].size < dirSize) top10Largest[9] = {path: currentPath, size: dirSize, smallBrain: getByteSizeString(dirSize)};
        //   top10Largest.sort((a ,b) => b.size - a.size);
        // }
      }
    }catch(err){
      // console.error(err)
    }
    return dirSize;
    // console.log(dirSize, currentPath);
  }
  await calculateSize(dirPath);
  return {totalSize, raport};
}

// Handle IPC calls from renderer
ipcMain.handle('open-explorer', (event, data) =>{
  openFolderInExplorer(data);
});
ipcMain.handle('read-raport', () => readRaportFile());

ipcMain.handle('readDir', (event, path) => readDir(path));
ipcMain.handle('getStats', (event, path) => getStats(path));
ipcMain.handle('getItemStats', (event, data) => getItemStats(data));
ipcMain.handle('calculateDirSizes', (event, data) => calculateDirSizes(data.raport, data.dirPath));
ipcMain.handle('write-raport', (event, data) => {
  writeRaportFile(data);
  return { status: 'success' };
});


const mainPath = path.join(__dirname, 'client', 'index.html');

const createWindow = () => {
    const win = new BrowserWindow({
      width: 1280,
      height: 720,
      backgroundColor: 'black',
      autoHideMenuBar: true,
      show: false,
      icon: path.join(__dirname, 'assets' ,'icon.ico'),
      webPreferences: {
        // offscreen: true,
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
      }  
    })
  
    win.loadFile(mainPath);
    // win.removeMenu();
    // win.setFullScreen(true);
    win.once('ready-to-show', () => {
      win.show();
    });
  }

app.whenReady().then(() => {
    createWindow()
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
