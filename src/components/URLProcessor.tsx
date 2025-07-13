import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Link, 
  Music, 
  Play, 
  Download, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Youtube,
  Music2,
  Globe,
  Copy,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'react-hot-toast';

interface ProcessedURL {
  id: string;
  originalUrl: string;
  cleanUrl: string;
  type: 'youtube' | 'spotify' | 'unknown';
  status: 'processing' | 'ready' | 'error';
  audioUrl?: string;
  title?: string;
  duration?: number;
  error?: string;
}

interface URLProcessorProps {
  onAudioProcessed?: (url: string, audioUrl: string) => void;
}

const URLProcessor: React.FC<URLProcessorProps> = ({ onAudioProcessed }) => {
  const [inputUrl, setInputUrl] = useState('');
  const [processedUrls, setProcessedUrls] = useState<ProcessedURL[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Audio processing patterns from Rave.DJ Bot repository
  const isValidYouTubeUrl = (url: string): boolean => {
    const videoPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/watch\?v=[\w-]{11}.*/;
    const shortenedVideoPattern = /^(https?:\/\/)?(www\.)?youtu\.be\/[\w-]{11}/;
    
    return videoPattern.test(url) || shortenedVideoPattern.test(url);
  };

  const isValidSpotifyUrl = (url: string): boolean => {
    // This regex covers tracks, albums, and playlists only
    const pattern = /^https:\/\/open\.spotify\.com\/(track|album|playlist)\/[a-zA-Z0-9]{22}$/;
    return pattern.test(url);
  };

  const verifyLinks = (url: string): boolean => {
    return isValidSpotifyUrl(url) || isValidYouTubeUrl(url);
  };

  const cleanUrl = (url: string): string => {
    if (url.includes('youtube')) {
      const match = url.match(/^(https:\/\/www\.youtube\.com\/watch\?v=[\w-]{11})/);
      if (match) {
        return match[1];
      }
    }
    return url;
  };

  const getUrlType = (url: string): 'youtube' | 'spotify' | 'unknown' => {
    if (isValidYouTubeUrl(url)) return 'youtube';
    if (isValidSpotifyUrl(url)) return 'spotify';
    return 'unknown';
  };

  const simulateAudioProcessing = async (processedUrl: ProcessedURL): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15 + 5;
        setProcessingProgress(Math.min(progress, 100));
        
        if (progress >= 100) {
          clearInterval(interval);
          
          // Simulate success or failure
          const success = Math.random() > 0.1; // 90% success rate
          
          setProcessedUrls(prev => prev.map(url => 
            url.id === processedUrl.id 
              ? {
                  ...url,
                  status: success ? 'ready' : 'error',
                  audioUrl: success ? `data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvGEaAC2Ew9zToibvCCBxy/Df...` : undefined,
                  title: success ? `Processed Audio from ${url.type.charAt(0).toUpperCase() + url.type.slice(1)}` : undefined,
                  duration: success ? Math.floor(Math.random() * 300) + 60 : undefined,
                  error: success ? undefined : 'Failed to process audio from URL'
                }
              : url
          ));
          
          if (success) {
            resolve();
          } else {
            reject(new Error('Processing failed'));
          }
        }
      }, 200);
    });
  };

  const processUrl = useCallback(async () => {
    if (!inputUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    const trimmedUrl = inputUrl.trim();
    
    if (!verifyLinks(trimmedUrl)) {
      toast.error('Invalid URL. Please enter a valid YouTube or Spotify URL');
      return;
    }

    const cleanedUrl = cleanUrl(trimmedUrl);
    const urlType = getUrlType(trimmedUrl);
    
    const newProcessedUrl: ProcessedURL = {
      id: Date.now().toString(),
      originalUrl: trimmedUrl,
      cleanUrl: cleanedUrl,
      type: urlType,
      status: 'processing'
    };

    setProcessedUrls(prev => [newProcessedUrl, ...prev]);
    setIsProcessing(true);
    setProcessingProgress(0);
    setInputUrl('');

    try {
      await simulateAudioProcessing(newProcessedUrl);
      toast.success(`${urlType.charAt(0).toUpperCase() + urlType.slice(1)} URL processed successfully!`);
      
      // Trigger callback if audio was processed successfully
      const processedItem = processedUrls.find(url => url.id === newProcessedUrl.id);
      if (processedItem?.audioUrl && onAudioProcessed) {
        onAudioProcessed(processedItem.cleanUrl, processedItem.audioUrl);
      }
    } catch (error) {
      toast.error(`Failed to process ${urlType} URL`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  }, [inputUrl, processedUrls, onAudioProcessed]);

  const removeProcessedUrl = (id: string) => {
    setProcessedUrls(prev => prev.filter(url => url.id !== id));
    toast.success('URL removed');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('URL copied to clipboard');
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeIcon = (type: 'youtube' | 'spotify' | 'unknown') => {
    switch (type) {
      case 'youtube':
        return <Youtube className="w-4 h-4" />;
      case 'spotify':
        return <Music2 className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: 'youtube' | 'spotify' | 'unknown') => {
    switch (type) {
      case 'youtube':
        return 'border-red-500/30 text-red-400';
      case 'spotify':
        return 'border-green-500/30 text-green-400';
      default:
        return 'border-gray-500/30 text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input Section */}
      <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Link className="w-5 h-5 mr-2 text-blue-400" />
            URL Audio Processor
          </CardTitle>
          <CardDescription className="text-gray-400">
            Extract audio from YouTube videos and Spotify tracks using advanced processing algorithms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-3">
            <div className="flex-1">
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Paste YouTube or Spotify URL here..."
                className="bg-black/20 border-white/20 text-white placeholder:text-gray-500"
                onKeyPress={(e) => e.key === 'Enter' && !isProcessing && processUrl()}
                disabled={isProcessing}
              />
            </div>
            <Button
              onClick={processUrl}
              disabled={isProcessing || !inputUrl.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Music className="w-4 h-4 mr-2" />
              )}
              Process
            </Button>
          </div>

          {/* Processing Progress */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2"
              >
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Processing audio from URL...</span>
                  <span>{processingProgress.toFixed(0)}%</span>
                </div>
                <Progress value={processingProgress} className="h-2" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Supported Platforms */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Badge variant="outline" className="border-red-500/30 text-red-400">
              <Youtube className="w-3 h-3 mr-1" />
              YouTube
            </Badge>
            <Badge variant="outline" className="border-green-500/30 text-green-400">
              <Music2 className="w-3 h-3 mr-1" />
              Spotify
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Processed URLs List */}
      <AnimatePresence>
        {processedUrls.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h4 className="text-lg font-semibold text-white flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-400" />
              Processed URLs ({processedUrls.length})
            </h4>
            
            <div className="space-y-3">
              {processedUrls.map((processedUrl, index) => (
                <motion.div
                  key={processedUrl.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="bg-black/20 border-white/10 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            processedUrl.status === 'ready' 
                              ? 'bg-green-500/20 border border-green-500/30'
                              : processedUrl.status === 'error'
                              ? 'bg-red-500/20 border border-red-500/30'
                              : 'bg-blue-500/20 border border-blue-500/30'
                          }`}>
                            {processedUrl.status === 'processing' ? (
                              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                            ) : processedUrl.status === 'error' ? (
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                            ) : (
                              getTypeIcon(processedUrl.type)
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2">
                              <p className="text-white font-medium truncate">
                                {processedUrl.title || 'Processing...'}
                              </p>
                              <Badge 
                                variant="outline" 
                                className={`text-xs ${getTypeColor(processedUrl.type)}`}
                              >
                                {processedUrl.type.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="flex items-center space-x-3 text-sm text-gray-400">
                              <span className="truncate max-w-xs">{processedUrl.cleanUrl}</span>
                              {processedUrl.duration && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(processedUrl.duration)}</span>
                                </>
                              )}
                              {processedUrl.error && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-400">{processedUrl.error}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {processedUrl.status === 'ready' && processedUrl.audioUrl && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Create audio element and play
                                  const audio = new Audio(processedUrl.audioUrl);
                                  audio.play().catch(() => toast.error('Failed to play audio'));
                                }}
                                className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  // Create download link
                                  const link = document.createElement('a');
                                  link.href = processedUrl.audioUrl!;
                                  link.download = `audio_${processedUrl.type}_${processedUrl.id}.wav`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  toast.success('Download started');
                                }}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(processedUrl.cleanUrl)}
                            className="text-gray-400 hover:text-white hover:bg-white/10"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeProcessedUrl(processedUrl.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default URLProcessor;