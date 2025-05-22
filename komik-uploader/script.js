const clientId = '498675093395-eqfipb1gobnstd52vvscqmdm4mkons6b.apps.googleusercontent.com';
const redirectUri = 'http://127.0.0.1:5500';
const scope = 'https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/drive.file';
let token = null;

// Check for token on page load
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hash.includes('access_token')) {
    const params = new URLSearchParams(window.location.hash.substring(1));
    token = params.get('access_token');
    document.getElementById('auth').textContent = 'Terautentikasi';
    document.getElementById('auth').classList.remove('bg-blue-500');
    document.getElementById('auth').classList.add('bg-green-500');
    
    // Clear the hash without reloading the page
    history.replaceState(null, null, ' ');
    
    // Show success notification
    showNotification('Login berhasil!', 'success');
  }
});

// Auth button click
document.getElementById('auth').onclick = () => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}`;
  window.location.href = url;
};

// Dark mode toggle
document.getElementById('toggleDark').onclick = () => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
};

// Check saved dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark');
}

// File handling variables
let files = [];

// File input change handler
document.getElementById('fileElem').addEventListener('change', handleFiles);

// Drag and drop handlers
const dropArea = document.getElementById('drop-area');
dropArea.addEventListener('dragenter', preventDefaults, false);
dropArea.addEventListener('dragover', preventDefaults, false);
dropArea.addEventListener('dragleave', () => {
  dropArea.classList.remove('border-blue-500');
  dropArea.classList.add('border-gray-300');
}, false);
dropArea.addEventListener('drop', handleDrop, false);

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
  dropArea.classList.remove('border-gray-300');
  dropArea.classList.add('border-blue-500');
}

function handleDrop(e) {
  preventDefaults(e);
  dropArea.classList.remove('border-blue-500');
  dropArea.classList.add('border-gray-300');
  
  const dt = e.dataTransfer;
  const fileList = dt.files;
  
  document.getElementById('fileElem').files = fileList;
  handleFiles({ target: { files: fileList } });
}

// Process files (from input or drop)
async function handleFiles(e) {
  showLoader('Memproses file...');
  const list = e.target.files;
  files = [];
  
  try {
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      if (f.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(f);
        const imgFiles = Object.values(zip.files).filter(f => /\.(jpg|jpeg|png)$/i.test(f.name));
        // Sort files by name to maintain order
        imgFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        for (let j = 0; j < imgFiles.length; j++) {
          const blob = await imgFiles[j].async('blob');
          files.push(new File([blob], `page_${String(files.length + 1).padStart(3, '0')}.jpg`, { type: 'image/jpeg' }));
        }
      } else if (/\.(jpg|jpeg|png)$/i.test(f.name)) {
        files.push(await compressAndRename(f, files.length + 1));
      }
    }
    
    updatePreview();
    hideLoader();
    showNotification(`${files.length} file siap diupload!`, 'success');
  } catch (error) {
    hideLoader();
    showNotification('Error memproses file: ' + error.message, 'error');
    console.error(error);
  }
}

// Compress and rename files
async function compressAndRename(file, index) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 800;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          const newFile = new File([blob], `page_${String(index).padStart(3, '0')}.jpg`, { type: 'image/jpeg' });
          resolve(newFile);
        }, 'image/jpeg', 0.8);
      };
      
      img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
  });
}

// Update preview area with images
function updatePreview() {
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  
  files.forEach((file, index) => {
    const container = document.createElement('div');
    container.className = 'preview-item';
    
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.className = 'max-h-32 rounded shadow';
    
    const number = document.createElement('span');
    number.textContent = index + 1;
    number.className = 'absolute top-0 left-0 bg-black bg-opacity-70 text-white px-2 rounded-bl';
    
    container.appendChild(img);
    container.appendChild(number);
    preview.appendChild(container);
  });
}

// Upload button click handler
document.getElementById('uploadBtn').addEventListener('click', async () => {
  if (!token) {
    return showNotification('Silahkan login terlebih dahulu!', 'error');
  }
  
  if (files.length === 0) {
    return showNotification('Silahkan pilih file terlebih dahulu!', 'error');
  }
  
  const log = document.getElementById('log');
  log.innerHTML = '';
  const output = document.getElementById('format').value;
  let htmlContent = '', allLinks = '';
  
  showLoader('Uploading...');
  
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Update progress indication
      updateLoader(`Uploading ${i+1}/${files.length}: ${file.name}`);
      
      // Create a log entry for this file
      const logEntry = document.createElement('div');
      logEntry.className = 'mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded';
      logEntry.innerHTML = `
        <p class="mb-1">Uploading ${file.name}...</p>
        <div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div id="prog${i}" class="bg-blue-600 h-2.5 rounded-full" style="width: 0%"></div>
        </div>
      `;
      log.appendChild(logEntry);
      
      // Use FormData for properly handling the multipart upload
      const form = new FormData();
      
      // Add metadata part
      const metadata = {
        name: file.name,
        mimeType: file.type
      };
      
      const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
      form.append('metadata', metadataBlob);
      
      // Add file part
      form.append('file', file);
      
      // Using XMLHttpRequest to track upload progress
      const xhr = new XMLHttpRequest();
      
      // Create a promise to handle the upload
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded * 100) / event.total);
            document.getElementById(`prog${i}`).style.width = `${percentComplete}%`;
          }
        };
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Server returned ${xhr.status}: ${xhr.statusText}`));
          }
        };
        
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(form);
      });
      
      // Wait for upload to complete
      const json = await uploadPromise;
      const fileId = json.id;
      
      // Update progress indicator to show completion
      document.getElementById(`prog${i}`).style.width = '100%';
      document.getElementById(`prog${i}`).classList.remove('bg-blue-600');
      document.getElementById(`prog${i}`).classList.add('bg-green-500');
      
      // Set file permissions to public
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      });
      
      // Get the public link
      const link = `https://drive.google.com/uc?id=${fileId}`;
      
      // Format the link according to selected output format
      let out = link;
      if (output === 'html') out = `<img src="${link}">`;
      if (output === 'md') out = `![](${link})`;
      
      htmlContent += out + "<br>";
      allLinks += out + "\n";
      
      // Update the log entry to show completion
      logEntry.innerHTML += `<p class="text-green-500 mt-1">✓ Upload selesai</p>`;
    }
    
    // Update the links textarea
    document.getElementById('allLinks').value = allLinks;
    
    // Create a blog post if we have images and title
    if (document.getElementById('judul').value) {
      updateLoader('Membuat postingan blog...');
      
      const blogId = '3600285783247979985';
      const postRes = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: document.getElementById('judul').value || 'Komik Baru',
          content: htmlContent,
          labels: document.getElementById('label').value.split(',').map(l => l.trim()).filter(l => l)
        })
      });
      
      if (!postRes.ok) {
        throw new Error(`Blog API error: ${postRes.status}`);
      }
      
      const result = await postRes.json();
      
      // Add success message to log
      const successEntry = document.createElement('div');
      successEntry.className = 'mt-4 p-3 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded';
      successEntry.innerHTML = `
        <p class="font-bold">Upload selesai!</p>
        <p class="mt-2">Postingan berhasil dibuat: <a href="${result.url}" target="_blank" class="underline">Lihat postingan</a></p>
      `;
      log.appendChild(successEntry);
    }
    
    hideLoader();
    showNotification('Upload selesai!', 'success');
    
  } catch (error) {
    hideLoader();
    showNotification('Error: ' + error.message, 'error');
    console.error(error);
    
    // Add error message to log
    const errorEntry = document.createElement('div');
    errorEntry.className = 'mt-4 p-3 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded';
    errorEntry.innerHTML = `<p class="font-bold">Error:</p><p>${error.message}</p>`;
    log.appendChild(errorEntry);
  }
});

// Copy all links button
document.getElementById('copyAll').onclick = () => {
  const textarea = document.getElementById('allLinks');
  textarea.select();
  document.execCommand('copy');
  showNotification('Link berhasil disalin!', 'success');
};

// Notification functions
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded shadow-lg transition-opacity duration-500 z-50 ${
    type === 'success' ? 'bg-green-500 text-white' : 
    type === 'error' ? 'bg-red-500 text-white' : 
    'bg-blue-500 text-white'
  }`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}

// Loader functions
function showLoader(message = 'Loading...') {
  let loader = document.getElementById('loader');
  
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'loader';
    loader.className = 'fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50';
    loader.innerHTML = `
      <div class="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex flex-col items-center">
        <div class="loader-spinner mb-3"></div>
        <p id="loader-message" class="text-gray-700 dark:text-gray-300"></p>
      </div>
    `;
    document.body.appendChild(loader);
  }
  
  document.getElementById('loader-message').textContent = message;
}

function updateLoader(message) {
  const loaderMessage = document.getElementById('loader-message');
  if (loaderMessage) {
    loaderMessage.textContent = message;
  }
}

function hideLoader() {
  const loader = document.getElementById('loader');
  if (loader) {
    document.body.removeChild(loader);
  }
}
