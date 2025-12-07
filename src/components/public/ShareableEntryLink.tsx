// src/components/public/ShareableEntryLink.tsx
import React, { useState } from 'react';
import { Link2, Copy, Check, QrCode, Mail, Facebook, Twitter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareableEntryLinkProps {
  trialId: string;
  trialName: string;
}

export default function ShareableEntryLink({ trialId, trialName }: ShareableEntryLinkProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const entryUrl = `${window.location.origin}/entries/${trialId}`;
  const encodedUrl = encodeURIComponent(entryUrl);
  const encodedTitle = encodeURIComponent(trialName);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(entryUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert(`Entry link: ${entryUrl}`);
    }
  };

  const shareViaEmail = () => {
    const subject = `Enter ${trialName}`;
    const body = `Hi!

I'd like to invite you to enter the ${trialName}.

To register your dog, please visit:
${entryUrl}

See you at the trial!`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const shareToFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const shareToTwitter = () => {
    const text = `Now accepting entries for ${trialName}!`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodedUrl}`,
      '_blank',
      'width=600,height=400'
    );
  };

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-4">
        <Link2 className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Public Entry Link</h3>
      </div>
      
      <p className="text-sm text-gray-700 mb-4">
        Share this link with participants so they can enter the trial. No login required!
      </p>

      {/* URL Display and Copy */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between space-x-3">
          <div className="flex-1 overflow-hidden">
            <p className="text-xs text-gray-500 mb-1">Entry Form URL</p>
            <p className="text-sm font-mono text-gray-900 truncate">
              {entryUrl}
            </p>
          </div>
          <button
            onClick={handleCopy}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Options */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          Share via
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={shareViaEmail}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-300 hover:bg-orange-50 transition-all group"
          >
            <Mail className="h-5 w-5 text-gray-600 group-hover:text-orange-600" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
              Email
            </span>
          </button>

          <button
            onClick={shareToFacebook}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <Facebook className="h-5 w-5 text-gray-600 group-hover:text-orange-600" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-orange-600">
              Facebook
            </span>
          </button>

          <button
            onClick={shareToTwitter}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-sky-400 hover:bg-sky-50 transition-all group"
          >
            <Twitter className="h-5 w-5 text-gray-600 group-hover:text-sky-500" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-sky-500">
              Twitter
            </span>
          </button>

          <button
            onClick={() => setShowQR(!showQR)}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-lg hover:border-purple

-300 hover:bg-purple

-50 transition-all group"
          >
            <QrCode className="h-5 w-5 text-gray-600 group-hover:text-purple

-600" />
            <span className="text-sm font-medium text-gray-700 group-hover:text-purple

-600">
              QR Code
            </span>
          </button>
        </div>
      </div>

     {/* QR Code Display */}
      {showQR && (
        <div className="mt-4 p-3 sm:p-4 bg-white border-2 border-green-200 rounded-lg text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-3">
            Scan this QR code to open the entry form
          </p>
          <div className="inline-block p-2 sm:p-4 bg-white">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`}
              alt="QR Code for entry form"
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Save or print this QR code for easy sharing
          </p>
        </div>
      )}

      {/* Test Link */}
      <div className="mt-4 pt-4 border-t border-green-200">
        <a
          href={entryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-green-700 hover:text-green-800 font-medium underline"
        >
          → Test the entry form in a new tab
        </a>
      </div>
    </div>
  );
}