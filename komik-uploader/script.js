const clientId = 'YOUR_CLIENT_ID';
const redirectUri = 'http://localhost';
const scope = 'https://www.googleapis.com/auth/blogger https://www.googleapis.com/auth/drive.file';
let token = null;

document.getElementById('auth').onclick = () => {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${encodeURIComponent(scope)}`;
  window.location.href = url;
};

if (window.location.hash.includes('access_token')) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  token = params.get('access_token');
  document.getElementById('auth').textContent = 'Terautentikasi';
}

document.getElementById('toggleDark').onclick = () => {
  document.body.classList.toggle('dark');
};

let files = [];
document.getElementById('fileElem').addEventListener('change', async (e) => {
  const list = e.target.files;
  files = [];
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    if (f.name.endsWith('.zip')) {
      const zip = await JSZip.loadAsync(f);
      const imgFiles = Object.values(zip.files).filter(f => /\.(jpg|png)$/i.test(f.name));
      for (let j = 0; j < imgFiles.length; j++) {
        const blob = await imgFiles[j].async('blob');
        files.push(new File([blob], `page_${String(files.length + 1).padStart(3, '0')}.jpg`, { type: 'image/jpeg' }));
      }
    } else {
      files.push(await compressAndRename(f, files.length + 1));
    }
  }
  const preview = document.getElementById('preview');
  preview.innerHTML = '';
  files.forEach((file) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  });
});

async function compressAndRename(file, index) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 800 / img.width;
        canvas.width = 800;
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

document.getElementById('uploadBtn').addEventListener('click', async () => {
  if (!token || files.length === 0) return alert('Login dulu dan pilih file');
  const log = document.getElementById('log');
  const output = document.getElementById('format').value;
  let htmlContent = '', allLinks = '';

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const form = new FormData();
    form.append('file', file);

    log.innerHTML += `<p>Uploading ${file.name}...</p><progress id="prog${i}" value="0" max="100"></progress>`;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    });
    const json = await res.json();
    const fileId = json.id;
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });
    const link = `https://drive.google.com/uc?id=${fileId}`;
    let out = link;
    if (output === 'html') out = `<img src="${link}">`;
    if (output === 'md') out = `![](${link})`;
    htmlContent += out + "<br>";
    allLinks += out + "\\n";
  }

  document.getElementById('allLinks').value = allLinks;

  const blogId = 'YOUR_BLOG_ID';
  const postRes = await fetch(`https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: document.getElementById('judul').value || 'Komik Baru',
      content: htmlContent,
      labels: document.getElementById('label').value.split(',').map(l => l.trim())
    })
  });

  const result = await postRes.json();
  log.innerHTML += `<p>Sukses! <a href="${result.url}" target="_blank">Lihat postingan</a></p>`;
});

document.getElementById('copyAll').onclick = () => {
  document.getElementById('allLinks').select();
  document.execCommand('copy');
};
