"use client";

import { useState, useEffect, useRef } from 'react';
import { Upload, Download, PackageOpen, Info, Loader2 } from 'lucide-react';

export default function ApkManagementPage() {
  const [releases, setReleases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [versionName, setVersionName] = useState('');
  const [changelog, setChangelog] = useState('');
  const [uploaderName, setUploaderName] = useState('Admin');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const fetchReleases = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/apk/list');
      const data = await res.json();
      if (data.success) {
        setReleases(data.data);
      }
    } catch (err) {
      console.error("Lỗi khi tải danh sách:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReleases();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !versionName) {
      setUploadStatus({ type: 'error', message: 'Vui lòng chọn file APK và nhập Version Name' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('apk', selectedFile);
    formData.append('version_name', versionName);
    formData.append('changelog', changelog);
    formData.append('uploader', uploaderName);

    try {
      const res = await fetch('/api/apk/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setUploadStatus({ type: 'success', message: 'Tải lên thành công!' });
        // Reset form
        setVersionName('');
        setChangelog('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Cập nhật lại danh sách
        fetchReleases();
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Tải lên thất bại' });
      }
    } catch (err: any) {
      setUploadStatus({ type: 'error', message: 'Lỗi kết nối khi tải lên' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Hệ Thống Quản Lý File APK</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Nơi upload và chia sẻ file cài đặt Android cho dự án.</p>
        </div>

        {/* Upload Form */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-500" /> Tải lên phiên bản mới
          </h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Version Name (VD: v1.0.5) *</label>
                <input 
                  type="text" 
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="v1.0.0"
                  required
                  className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Người tải lên</label>
                <input 
                  type="text" 
                  value={uploaderName}
                  onChange={(e) => setUploaderName(e.target.value)}
                  className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Changelog (Ghi chú thay đổi)</label>
              <textarea 
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Thêm tính năng mới, sửa lỗi..."
                rows={3}
                className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">File APK *</label>
              <input 
                type="file" 
                accept=".apk"
                ref={fileInputRef}
                onChange={handleFileChange}
                required
                className="w-full border p-2 rounded bg-gray-50 dark:bg-gray-700 dark:border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-300"
              />
            </div>

            {uploadStatus && (
              <div className={`p-3 rounded text-sm ${uploadStatus.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {uploadStatus.message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={uploading || !selectedFile || !versionName}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {uploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Đang xử lý...</> : <><Upload className="w-5 h-5" /> Tải Lên APK</>}
            </button>
          </form>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg flex items-start gap-3">
          <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p><strong>Hướng dẫn cho AI/Script:</strong></p>
            <p>Sử dụng API <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">POST /api/apk/upload</code> với multipart form-data (fields: apk, version_name, changelog, uploader).</p>
            <p>Tải bản mới nhất qua API: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">GET /api/apk/latest</code>.</p>
          </div>
        </div>

        {/* Release List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 overflow-hidden">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PackageOpen className="w-5 h-5 text-gray-500" /> Danh Sách Phiên Bản
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                  <th className="p-3 font-medium">Phiên bản</th>
                  <th className="p-3 font-medium">Thay đổi</th>
                  <th className="p-3 font-medium">Dung lượng</th>
                  <th className="p-3 font-medium">Người đăng</th>
                  <th className="p-3 font-medium">Ngày tải lên</th>
                  <th className="p-3 font-medium text-right">Tải về</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                      Đang tải danh sách...
                    </td>
                  </tr>
                ) : releases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      Chưa có bản APK nào được tải lên.
                    </td>
                  </tr>
                ) : (
                  releases.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold">{r.version_name}</div>
                        <div className="text-xs text-gray-500">Code: #{r.version_code}</div>
                      </td>
                      <td className="p-3 text-sm max-w-xs truncate" title={r.changelog || 'Không có'}>
                        {r.changelog || '-'}
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        {(r.file_size / (1024 * 1024)).toFixed(1)} MB
                      </td>
                      <td className="p-3 text-sm whitespace-nowrap">{r.uploader}</td>
                      <td className="p-3 text-sm whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-3 text-right">
                        <a 
                          href={r.download_url}
                          className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
                        >
                          <Download className="w-4 h-4" /> Tải
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
