import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Platform,
  Modal,
  PanResponder,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthController } from '../controllers/AuthController';
import { Module } from '../models/Module';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Toast from '../../components/Toast';
import { useToast } from '../../hooks/useToast';

interface UploadedFile {
  name: string;
  uri: string;
  type: string;
  size: number;
}

const categories = [
  'Punching',
  'Kicking',
  'Palm Strikes',
  'Elbow Strikes',
  'Knee Strikes',
  'Defensive Moves',
];

const physicalDemandTags = [
  'Flexibility',
  'Strength',
  'Endurance',
  'Balance',
  'Coordination',
  'Speed',
  'Agility',
  'Power',
];

export default function PublishModulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { toastVisible, toastMessage, showToast, hideToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);
  const introductionVideoInputRef = useRef<HTMLInputElement | null>(null);
  const videoDropZoneRef = useRef<View>(null);
  const introductionVideoDropZoneRef = useRef<View>(null);
  const [isDraggingVideo, setIsDraggingVideo] = useState(false);
  const [isDraggingIntroductionVideo, setIsDraggingIntroductionVideo] = useState(false);

  // Form state
  const [moduleTitle, setModuleTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [introduction, setIntroduction] = useState('');
  const [introductionType, setIntroductionType] = useState<'text' | 'video'>('text');
  const [introductionVideo, setIntroductionVideo] = useState<UploadedFile | null>(null);
  const [videoLink, setVideoLink] = useState('');
  const [videoFile, setVideoFile] = useState<UploadedFile | null>(null);
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const videoPlayerRef = useRef<any>(null);
  const introductionVideoPlayerRef = useRef<any>(null);
  const [intensityLevel, setIntensityLevel] = useState(2);
  const [spaceRequirements, setSpaceRequirements] = useState<string[]>([]);
  const [selectedPhysicalDemandTags, setSelectedPhysicalDemandTags] = useState<string[]>([]);
  const [showPhysicalDemandDropdown, setShowPhysicalDemandDropdown] = useState(false);
  const [certificationChecked, setCertificationChecked] = useState(false);
  const [errors, setErrors] = useState({
    moduleTitle: '',
    description: '',
    category: '',
    video: '',
    thumbnail: '',
  });
  // Slider refs and state
  const sliderTrackRef = useRef<View>(null);
  const sliderThumbRef = useRef<View>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderPageX = useRef(0);
  const isDragging = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const thumbPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const checkTrainerStatus = async () => {
      try {
        const currentUser = await AuthController.getCurrentUser();
        if (!currentUser) {
          showToast('Please log in to publish modules');
          router.replace('/(auth)/login');
          return;
        }
        if (currentUser.role !== 'trainer' || !currentUser.trainerApproved) {
          showToast('Only certified trainers can publish modules');
          router.push('/trainer');
          return;
        }
      } catch (error) {
        console.error('Error checking trainer status:', error);
        showToast('Failed to verify trainer status');
        router.push('/trainer');
      }
    };

    checkTrainerStatus();
  }, []);

  /**
   * Calculate intensity level from absolute page X position
   * Maps position to levels 1-5 with proper thresholds
   */
  const calculateLevelFromPosition = useCallback((pageX: number): number => {
    if (sliderWidth <= 0 || sliderPageX.current <= 0) return intensityLevel;
    
    const relativeX = pageX - sliderPageX.current;
    const clampedX = Math.max(0, Math.min(relativeX, sliderWidth));
    const percentage = clampedX / sliderWidth;
    
    // Map to levels 1-5 with equal segments
    // 0-20% = 1, 20-40% = 2, 40-60% = 3, 60-80% = 4, 80-100% = 5
    const levelIndex = Math.floor(percentage * 5);
    return Math.min(levelIndex, 4) + 1;
  }, [sliderWidth, intensityLevel]);

  /**
   * Update intensity level and animate thumb position
   */
  const updateIntensityFromPosition = useCallback((pageX: number) => {
    if (sliderWidth <= 0 || sliderPageX.current <= 0) return;
    
    const relativeX = pageX - sliderPageX.current;
    const clampedX = Math.max(0, Math.min(relativeX, sliderWidth));
    const percentage = clampedX / sliderWidth;
    
    // Calculate new level
    const newLevel = calculateLevelFromPosition(pageX);
    
    // Update level if changed
    if (newLevel !== intensityLevel) {
      setIntensityLevel(newLevel);
    }
    
    // Update animated position for smooth dragging (0 to sliderWidth)
    thumbPosition.setValue(clampedX);
  }, [sliderWidth, calculateLevelFromPosition, intensityLevel, thumbPosition]);

  /**
   * Handle track press - jump to clicked position
   */
  const handleTrackPress = useCallback((evt: any) => {
    if (!sliderTrackRef.current) return;
    
    sliderTrackRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
      sliderPageX.current = pageX;
      const pageXValue = evt.nativeEvent?.pageX || evt.pageX || 
        (evt.clientX !== undefined ? evt.clientX + (typeof window !== 'undefined' ? window.scrollX || 0 : 0) : 0);
      
      const newLevel = calculateLevelFromPosition(pageXValue);
      setIntensityLevel(newLevel);
      
      // Animate thumb to new position
      const relativeX = pageXValue - pageX;
      const clampedX = Math.max(0, Math.min(relativeX, sliderWidth));
      Animated.spring(thumbPosition, {
        toValue: clampedX,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    });
  }, [calculateLevelFromPosition, sliderWidth, thumbPosition]);

  /**
   * PanResponder for touch/mobile drag handling
   */
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return isDragging.current || Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        setIsDraggingState(true);
        
        sliderTrackRef.current?.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          sliderPageX.current = pageX;
          updateIntensityFromPosition(evt.nativeEvent.pageX);
        });
      },
      onPanResponderMove: (evt) => {
        if (isDragging.current && sliderPageX.current > 0) {
          updateIntensityFromPosition(evt.nativeEvent.pageX);
        }
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        setIsDraggingState(false);
        
        // Snap to nearest level position
        const targetPosition = ((intensityLevel - 1) / 4) * sliderWidth;
        Animated.spring(thumbPosition, {
          toValue: targetPosition,
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        }).start();
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setIsDraggingState(false);
      },
      onPanResponderTerminationRequest: () => !isDragging.current,
    })
  ).current;

  /**
   * Get pageX from mouse/touch event (cross-platform)
   */
  const getPageX = useCallback((e: any): number => {
    if (Platform.OS === 'web') {
      return e.nativeEvent?.pageX || e.pageX || 
        (e.clientX !== undefined ? e.clientX + (window?.scrollX || 0) : 0);
    }
    return e.nativeEvent?.pageX || 0;
  }, []);

  /**
   * Web mouse down handler - start dragging
   */
  const handleMouseDown = useCallback((e: any) => {
    if (Platform.OS !== 'web') return;
    
    e.preventDefault();
    e.stopPropagation();
    isDragging.current = true;
    setIsDraggingState(true);
    
    const pageXValue = getPageX(e);
    
    if (sliderTrackRef.current) {
      sliderTrackRef.current.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        sliderPageX.current = pageX;
        updateIntensityFromPosition(pageXValue);
      });
    }
  }, [getPageX, updateIntensityFromPosition]);

  /**
   * Web mouse move handler - update while dragging
   */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (Platform.OS !== 'web' || !isDragging.current) return;
    
    e.preventDefault();
    const pageXValue = e.pageX !== undefined ? e.pageX : 
      (e.clientX !== undefined ? e.clientX + (window?.scrollX || 0) : 0);
    
    if (sliderPageX.current > 0 && pageXValue > 0) {
      updateIntensityFromPosition(pageXValue);
    }
  }, [updateIntensityFromPosition]);

  /**
   * Web mouse up handler - stop dragging and snap to level
   */
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (Platform.OS !== 'web' || !isDragging.current) return;
    
    e.preventDefault();
    isDragging.current = false;
    setIsDraggingState(false);
    
    // Snap to nearest level position
    const targetPosition = ((intensityLevel - 1) / 4) * sliderWidth;
    Animated.spring(thumbPosition, {
      toValue: targetPosition,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [intensityLevel, sliderWidth, thumbPosition]);

  /**
   * Sync thumb position when intensity level changes (from number clicks)
   */
  useEffect(() => {
    if (!isDragging.current && sliderWidth > 0) {
      const targetPosition = ((intensityLevel - 1) / 4) * sliderWidth;
      Animated.spring(thumbPosition, {
        toValue: targetPosition,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [intensityLevel, sliderWidth, thumbPosition]);

  /**
   * Setup global mouse event listeners for web
   */
  useEffect(() => {
    if (Platform.OS === 'web') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('mouseleave', handleMouseUp); // Handle mouse leaving window
      
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mouseleave', handleMouseUp);
      };
    }
  }, [handleMouseMove, handleMouseUp]);

  /**
   * Setup drag and drop event listeners for video upload (web only)
   */
  useEffect(() => {
    if (Platform.OS === 'web' && videoDropZoneRef.current) {
      const element = videoDropZoneRef.current as any;
      
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVideo(true);
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set dragging to false if we're leaving the upload area
        if (!element.contains(e.relatedTarget as Node)) {
          setIsDraggingVideo(false);
        }
      };

      const handleDrop = async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVideo(false);

        const files = Array.from(e.dataTransfer?.files || []);
        const videoFile = files.find((file: File) => file.type.startsWith('video/'));
        
        if (videoFile) {
          const uri = URL.createObjectURL(videoFile);
          await processVideoFile(videoFile, uri);
          if (errors.video) {
            setErrors(prev => ({ ...prev, video: '' }));
          }
        } else if (files.length > 0) {
          showToast('Please drop a video file');
        }
      };

      const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingVideo(true);
      };

      element.addEventListener('dragover', handleDragOver);
      element.addEventListener('dragleave', handleDragLeave);
      element.addEventListener('drop', handleDrop);
      element.addEventListener('dragenter', handleDragEnter);

      return () => {
        element.removeEventListener('dragover', handleDragOver);
        element.removeEventListener('dragleave', handleDragLeave);
        element.removeEventListener('drop', handleDrop);
        element.removeEventListener('dragenter', handleDragEnter);
      };
    }
  }, [errors.video]);

  /**
   * Setup drag and drop event listeners for introduction video upload (web only)
   */
  useEffect(() => {
    if (Platform.OS === 'web' && introductionVideoDropZoneRef.current && introductionType === 'video') {
      const element = introductionVideoDropZoneRef.current as any;
      
      const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingIntroductionVideo(true);
      };

      const handleDragLeave = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!element.contains(e.relatedTarget as Node)) {
          setIsDraggingIntroductionVideo(false);
        }
      };

      const handleDrop = async (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingIntroductionVideo(false);

        const files = Array.from(e.dataTransfer?.files || []);
        const videoFile = files.find((file: File) => file.type.startsWith('video/'));
        
        if (videoFile) {
          const uri = URL.createObjectURL(videoFile);
          setIntroductionVideo({
            name: videoFile.name,
            uri: uri,
            type: videoFile.type,
            size: videoFile.size,
          });
          showToast('Introduction video uploaded');
        } else if (files.length > 0) {
          showToast('Please drop a video file');
        }
      };

      const handleDragEnter = (e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDraggingIntroductionVideo(true);
      };

      element.addEventListener('dragover', handleDragOver);
      element.addEventListener('dragleave', handleDragLeave);
      element.addEventListener('drop', handleDrop);
      element.addEventListener('dragenter', handleDragEnter);

      return () => {
        element.removeEventListener('dragover', handleDragOver);
        element.removeEventListener('dragleave', handleDragLeave);
        element.removeEventListener('drop', handleDrop);
        element.removeEventListener('dragenter', handleDragEnter);
      };
    }
  }, [introductionType]);

  /**
   * Optimized video processing: Fast duration check, defer trimming to server
   * Strategy: Accept file immediately, check duration asynchronously, warn if needed
   * This prevents blocking the UI and provides better UX
   */
  const processVideoFile = async (file: File | any, uri: string): Promise<void> => {
    // Immediately accept the file - don't block the user
    const fileData = {
      name: file.name || 'video',
      uri: uri,
      type: file.type || 'video/mp4',
      size: file.size || 0,
    };
    
    setVideoFile(fileData);
    if (errors.video) {
      setErrors(prev => ({ ...prev, video: '' }));
    }
    
    if (Platform.OS === 'web' && file instanceof File) {
      // Fast async duration check - don't block UI
      checkVideoDurationAsync(file, uri);
    } else {
      // Mobile: Accept file, server will handle validation
      showToast('Video uploaded. Maximum length is 30 seconds.');
    }
  };

  /**
   * Fast, non-blocking duration check
   * Runs in background without blocking the UI
   */
  const checkVideoDurationAsync = (file: File, uri: string): void => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true; // Faster loading
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      showToast('Video uploaded. Duration check timed out - server will validate.');
      video.src = '';
      video.remove();
    }, 5000); // 5 second timeout
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const duration = video.duration;
      
      if (isNaN(duration) || duration === 0) {
        showToast('Video uploaded. Please ensure it\'s under 30 seconds.');
        video.src = '';
        video.remove();
        return;
      }
      
      setVideoDuration(duration);
      
      if (duration > 30) {
        // Warn user but don't block - server will trim during upload
        showToast(`Video is ${Math.round(duration)}s. It will be automatically trimmed to 30 seconds during upload.`);
      } else {
        showToast(`Video uploaded successfully (${Math.round(duration)}s)`);
      }
      
      // Cleanup
      video.src = '';
      video.remove();
    };
    
    video.onerror = () => {
      clearTimeout(timeout);
      showToast('Video uploaded. Server will validate duration.');
      video.src = '';
      video.remove();
    };
    
    // Start loading metadata (non-blocking)
    video.src = uri;
  };

  /**
   * REMOVED: Client-side video trimming function
   * 
   * Optimization Strategy:
   * - Removed slow, blocking client-side trimming (MediaRecorder + captureStream)
   * - Accept files immediately for better UX
   * - Fast async duration check (metadata only, non-blocking)
   * - Defer actual trimming to server-side processing during upload
   * 
   * Benefits:
   * - Instant file acceptance (no UI blocking)
   * - Faster user experience
   * - More reliable (server has better tools like FFmpeg)
   * - Better resource management
   * - Works consistently across all browsers/devices
   */

  const handleVideoUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        if (videoInputRef.current) {
          videoInputRef.current.click();
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'video/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          await processVideoFile(asset, asset.uri);
          if (errors.video) {
            setErrors(prev => ({ ...prev, video: '' }));
          }
        }
      }
    } catch (error: any) {
      console.error('Error selecting video:', error);
      showToast('Failed to select video');
    }
  };

  const handleIntroductionVideoUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        if (introductionVideoInputRef.current) {
          introductionVideoInputRef.current.click();
        }
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'video/*',
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          setIntroductionVideo({
            name: asset.name || 'introduction-video',
            uri: asset.uri,
            type: asset.mimeType || 'video/mp4',
            size: asset.size || 0,
          });
        }
      }
    } catch (error: any) {
      console.error('Error selecting introduction video:', error);
      showToast('Failed to select video');
    }
  };

  const handleIntroductionVideoChange = async (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      const uri = URL.createObjectURL(file);
      setIntroductionVideo({
        name: file.name,
        uri: uri,
        type: file.type,
        size: file.size,
      });
      showToast('Introduction video uploaded');
    }
    if (introductionVideoInputRef.current) {
      introductionVideoInputRef.current.value = '';
    }
  };

  const handleWebVideoChange = async (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      const uri = URL.createObjectURL(file);
      await processVideoFile(file, uri);
      if (errors.video) {
        setErrors(prev => ({ ...prev, video: '' }));
      }
    }
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleThumbnailUpload = async () => {
    try {
      if (Platform.OS === 'web') {
        if (thumbnailInputRef.current) {
          thumbnailInputRef.current.click();
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 9],
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          setThumbnail(result.assets[0].uri);
          if (errors.thumbnail) {
            setErrors(prev => ({ ...prev, thumbnail: '' }));
          }
        }
      }
    } catch (error: any) {
      console.error('Error selecting thumbnail:', error);
      showToast('Failed to select thumbnail');
    }
  };

  const handleWebThumbnailChange = (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      setThumbnail(URL.createObjectURL(file));
      if (errors.thumbnail) {
        setErrors(prev => ({ ...prev, thumbnail: '' }));
      }
    }
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const toggleSpaceRequirement = (requirement: string) => {
    setSpaceRequirements(prev =>
      prev.includes(requirement)
        ? prev.filter(r => r !== requirement)
        : [...prev, requirement]
    );
  };

  const togglePhysicalDemandTag = (tag: string) => {
    setSelectedPhysicalDemandTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  /**
   * Validate module title
   */
  const validateModuleTitle = (title: string): string => {
    if (!title.trim()) {
      return 'Module title is required';
    }
    if (title.length > 50) {
      return 'Module title must be 50 characters or less';
    }
    return '';
  };

  /**
   * Validate description
   */
  const validateDescription = (desc: string): string => {
    if (!desc.trim()) {
      return 'Description is required';
    }
    if (desc.length > 600) {
      return 'Description must be 600 characters or less';
    }
    return '';
  };

  /**
   * Validate category
   */
  const validateCategory = (cat: string): string => {
    if (!cat) {
      return 'Category is required';
    }
    return '';
  };

  const handlePublish = async () => {
    try {
      setLoading(true);

      // Validate all fields
      const titleError = validateModuleTitle(moduleTitle);
      const descError = validateDescription(description);
      const categoryError = validateCategory(category);
      const videoError = (!videoFile && !videoLink.trim()) ? 'Please upload a video or provide a video link' : '';
      const thumbnailError = !thumbnail ? 'Please upload a thumbnail' : '';

      setErrors({
        moduleTitle: titleError,
        description: descError,
        category: categoryError,
        video: videoError,
        thumbnail: thumbnailError,
      });

      if (titleError || descError || categoryError || videoError || thumbnailError) {
        showToast('Please fix the errors before submitting');
        setLoading(false);
        return;
      }

      if (!certificationChecked) {
        showToast('Please certify that this technique is appropriate and valid for self defense');
        setLoading(false);
        return;
      }

      const currentUser = await AuthController.getCurrentUser();
      if (!currentUser) {
        showToast('Please log in to publish modules');
        setLoading(false);
        return;
      }

      showToast('Uploading files and saving module...');

      // Upload files to Cloudinary
      let techniqueVideoUrl: string | undefined;
      let introductionVideoUrl: string | undefined;
      let thumbnailUrl: string | undefined;

      // Upload technique video
      if (videoFile) {
        try {
          showToast('Uploading technique video...');
          techniqueVideoUrl = await AuthController.uploadFileToCloudinary(
            videoFile.uri,
            'video',
            videoFile.name
          );
          console.log('✅ Technique video uploaded:', techniqueVideoUrl);
        } catch (error: any) {
          console.error('Error uploading technique video:', error);
          showToast('Failed to upload video. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Upload introduction video if present
      if (introductionType === 'video' && introductionVideo) {
        try {
          showToast('Uploading introduction video...');
          introductionVideoUrl = await AuthController.uploadFileToCloudinary(
            introductionVideo.uri,
            'video',
            introductionVideo.name
          );
          console.log('✅ Introduction video uploaded:', introductionVideoUrl);
        } catch (error: any) {
          console.error('Error uploading introduction video:', error);
          showToast('Failed to upload introduction video. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Upload thumbnail
      if (thumbnail) {
        try {
          showToast('Uploading thumbnail...');
          thumbnailUrl = await AuthController.uploadFileToCloudinary(
            thumbnail,
            'image',
            'thumbnail'
          );
          console.log('✅ Thumbnail uploaded:', thumbnailUrl);
        } catch (error: any) {
          console.error('Error uploading thumbnail:', error);
          showToast('Failed to upload thumbnail. Please try again.');
          setLoading(false);
          return;
        }
      }

      // Prepare module data
      const moduleData: Omit<Module, 'moduleId' | 'createdAt' | 'updatedAt'> = {
        trainerId: currentUser.uid,
        moduleTitle: moduleTitle.trim(),
        description: description.trim(),
        category: category,
        introductionType: introductionType,
        introduction: introductionType === 'text' ? introduction.trim() : undefined,
        introductionVideoUrl: introductionType === 'video' ? introductionVideoUrl : undefined,
        techniqueVideoUrl: techniqueVideoUrl,
        techniqueVideoLink: videoLink.trim() || undefined,
        videoDuration: videoDuration || undefined,
        thumbnailUrl: thumbnailUrl,
        intensityLevel: intensityLevel,
        spaceRequirements: spaceRequirements,
        physicalDemandTags: selectedPhysicalDemandTags,
        status: 'pending review',
        certificationChecked: certificationChecked,
      };

      // Save module to database
      showToast('Saving module to database...');
      const moduleId = await AuthController.saveModule(moduleData, false);
      console.log('✅ Module saved with ID:', moduleId);

      showToast('Module uploaded successfully! Please wait for admin approval. You will be notified once your module is reviewed.');
      
      // Clear form
      setModuleTitle('');
      setDescription('');
      setCategory('');
      setIntroduction('');
      setIntroductionType('text');
      setIntroductionVideo(null);
      setVideoLink('');
      setVideoFile(null);
      setThumbnail(null);
      setVideoDuration(null);
      setIntensityLevel(2);
      setSpaceRequirements([]);
      setSelectedPhysicalDemandTags([]);
      setCertificationChecked(false);
      
      // Navigate back after a short delay
      setTimeout(() => {
        router.push('/trainer');
      }, 1500);
    } catch (error: any) {
      console.error('Error publishing module:', error);
      showToast(error.message || 'Failed to publish module');
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = async () => {
    try {
      await AuthController.logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleMessages = () => {
    setShowMenu(false);
    // TODO: Navigate to messages page
    console.log('Navigate to messages');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Fixed Sidebar */}
        <View style={styles.sidebar}>
          <TouchableOpacity 
            style={styles.sidebarTopButton}
            onPress={() => setShowMenu(true)}
          >
            <Image
              source={require('../../assets/images/threedoticon.png')}
              style={styles.threeDotIcon}
            />
          </TouchableOpacity>

          <View style={styles.sidebarIconsBottom}>
            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/profile')}
            >
              <Image
                source={require('../../assets/images/blueprofileicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.sidebarButton, styles.sidebarActive]}
              onPress={() => router.push('/trainer')}
            >
              <Image
                source={require('../../assets/images/trainericon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.sidebarButton}
              onPress={() => router.push('/dashboard')}
            >
              <Image
                source={require('../../assets/images/homeicon.png')}
                style={styles.iconImage}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          <ScrollView contentContainerStyle={{ paddingBottom: 20, paddingTop: 20 }}>
            <View style={styles.twoColumnLayout}>
              {/* Left Column */}
              <View style={styles.leftColumn}>
                {/* Module Content Upload */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Technique Video</Text>
                  
                  {/* Video duration limit notice */}
                  <View style={styles.videoLimitNotice}>
                    <Ionicons name="information-circle-outline" size={16} color="#07bbc0" style={{ marginRight: 6 }} />
                    <Text style={styles.videoLimitText}>
                      Maximum video length: 30 seconds. Longer videos will be automatically trimmed.
                    </Text>
                  </View>
                  
                  {videoDuration !== null && videoDuration > 30 && (
                    <View style={styles.videoInfoContainer}>
                      <Ionicons name="information-circle-outline" size={16} color="#FFA500" style={{ marginRight: 6 }} />
                      <Text style={styles.videoInfoText}>
                        Video is {Math.round(videoDuration)}s. Will be trimmed to 30 seconds during upload.
                      </Text>
                    </View>
                  )}
                  
                  {videoDuration !== null && videoDuration <= 30 && (
                    <View style={styles.videoInfoContainer}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" style={{ marginRight: 6 }} />
                      <Text style={styles.videoInfoText}>
                        Video duration: {Math.round(videoDuration)}s ✓
                      </Text>
                    </View>
                  )}
                  
                  <View
                    ref={videoDropZoneRef}
                    style={[
                      styles.dropZone,
                      isDraggingVideo && styles.dropZoneDragging
                    ]}
                  >
                    <TouchableOpacity 
                      style={styles.dropZoneContent}
                      onPress={handleVideoUpload}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="cloud-upload-outline" size={32} color="#07bbc0" />
                      <Text style={styles.dropZoneText}>Drop or Paste Link Here</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.orContainer}>
                    <View style={styles.orLine} />
                    <Text style={styles.orText}>Or</Text>
                    <View style={styles.orLine} />
                  </View>
                  <TouchableOpacity 
                    style={styles.browseButton}
                    onPress={handleVideoUpload}
                  >
                    <Ionicons name="folder-outline" size={18} color="#07bbc0" style={{ marginRight: 6 }} />
                    <Text style={styles.browseButtonText}>Browse files</Text>
                  </TouchableOpacity>
                  {Platform.OS === 'web' && (
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      style={{ display: 'none' }}
                      onChange={handleWebVideoChange}
                    />
                  )}
                  {videoLink && (
                    <TextInput
                      style={styles.linkInput}
                      value={videoLink}
                      placeholder="Paste video link here..."
                      placeholderTextColor="#6b8693"
                      onChangeText={(text) => {
                        setVideoLink(text);
                        if (errors.video) {
                          setErrors(prev => ({ ...prev, video: '' }));
                        }
                      }}
                      autoCapitalize="none"
                    />
                  )}
                  {errors.video ? <Text style={styles.errorText}>{errors.video}</Text> : null}
                </View>

                {/* Video Player */}
                {videoFile && (
                  <View style={styles.section}>
                    <View style={styles.videoPlayerContainer}>
                      {/* Delete Button */}
                      <TouchableOpacity
                        style={styles.videoDeleteButton}
                        onPress={() => {
                          setVideoFile(null);
                          setVideoDuration(null);
                          if (videoPlayerRef.current) {
                            videoPlayerRef.current.pause();
                            videoPlayerRef.current.src = '';
                          }
                          showToast('Video removed');
                        }}
                      >
                        <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                      </TouchableOpacity>
                      
                      {/* Video Element */}
                      {Platform.OS === 'web' ? (
                        <video
                          ref={(ref) => { videoPlayerRef.current = ref; }}
                          src={videoFile.uri}
                          controls
                          style={styles.videoPlayer as any}
                          playsInline
                        />
                      ) : (
                        <View style={styles.videoPlayer}>
                          <Text style={styles.videoPlayerText}>Video: {videoFile.name}</Text>
                          <Text style={styles.videoPlayerSubtext}>Video playback available on web</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
                
                {/* Video Link Display */}
                {videoLink && !videoFile && (
                  <View style={styles.section}>
                    <View style={styles.videoLinkContainer}>
                      <TouchableOpacity
                        style={styles.videoDeleteButton}
                        onPress={() => {
                          setVideoLink('');
                          showToast('Video link removed');
                        }}
                      >
                        <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                      </TouchableOpacity>
                      <View style={styles.videoLinkContent}>
                        <Ionicons name="link" size={24} color="#07bbc0" />
                        <Text style={styles.videoLinkText} numberOfLines={2}>{videoLink}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* AI Training Specifications */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>AI Training Specifications</Text>
                  
                  {/* Intensity Level */}
                  <View style={styles.intensityContainer}>
                    <Text style={styles.intensityLabel}>Intensity Level</Text>
                    <View style={styles.sliderContainer}>
                      <TouchableOpacity
                        ref={sliderTrackRef}
                        style={styles.sliderTrack}
                        activeOpacity={1}
                        onLayout={(event) => {
                          const { width } = event.nativeEvent.layout;
                          setSliderWidth(width);
                          sliderTrackRef.current?.measure((x: number, y: number, w: number, h: number, pageX: number, pageY: number) => {
                            sliderPageX.current = pageX;
                            // Initialize thumb position
                            if (width > 0) {
                              const initialPosition = ((intensityLevel - 1) / 4) * width;
                              thumbPosition.setValue(initialPosition);
                            }
                          });
                        }}
                        onPress={handleTrackPress}
                        {...panResponder.panHandlers}
                        {...(Platform.OS === 'web' ? { onMouseDown: handleMouseDown } : {})}
                      >
                        {/* Track background fill - animated */}
                        <Animated.View 
                          style={[
                            styles.sliderFill,
                            sliderWidth > 0 ? {
                              width: thumbPosition.interpolate({
                                inputRange: [0, sliderWidth],
                                outputRange: [0, sliderWidth],
                                extrapolate: 'clamp',
                              }),
                            } : { width: `${((intensityLevel - 1) / 4) * 100}%` }
                          ]} 
                        />
                        
                        {/* Draggable thumb - animated position */}
                        <Animated.View
                          ref={sliderThumbRef}
                          style={[
                            styles.sliderThumb,
                            sliderWidth > 0 ? {
                              left: Animated.add(thumbPosition, -11), // Center the 22px thumb
                              transform: [
                                ...(isDraggingState ? [{ scale: 1.15 }] : []),
                              ],
                            } : {
                              left: `${((intensityLevel - 1) / 4) * 100}%`,
                              transform: [
                                { translateX: -11 },
                                ...(isDraggingState ? [{ scale: 1.15 }] : []),
                              ],
                            },
                            Platform.OS === 'web' ? { 
                              cursor: isDraggingState ? 'grabbing' as any : 'grab' as any 
                            } : {},
                            isDraggingState ? styles.sliderThumbDragging : {}
                          ]}
                          {...panResponder.panHandlers}
                          {...(Platform.OS === 'web' ? { onMouseDown: handleMouseDown } : {})}
                        />
                      </TouchableOpacity>
                      <View style={styles.sliderLabels}>
                        {[1, 2, 3, 4, 5].map((num) => (
                          <TouchableOpacity
                            key={num}
                            style={styles.sliderLabel}
                            onPress={() => setIntensityLevel(num)}
                          >
                            <Text style={[
                              styles.sliderLabelText,
                              intensityLevel === num && styles.sliderLabelTextActive
                            ]}>
                              {num}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>

                  {/* Space Requirement */}
                  <View style={styles.spaceRequirementContainer}>
                    <Text style={styles.spaceRequirementLabel}>Space Requirement</Text>
                    <View style={styles.checkboxGroup}>
                      {['Stationary', 'Arm/Leg Span (Medium Space)', 'Mobility (Large Space)'].map((req) => (
                        <TouchableOpacity
                          key={req}
                          style={styles.checkboxRow}
                          onPress={() => toggleSpaceRequirement(req)}
                        >
                          <View style={[
                            styles.checkbox,
                            spaceRequirements.includes(req) && styles.checkboxChecked
                          ]}>
                            {spaceRequirements.includes(req) && (
                              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                            )}
                          </View>
                          <Text style={styles.checkboxLabel}>{req}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Physical Demand Tags */}
                  <View style={styles.physicalDemandContainer}>
                    <Text style={styles.physicalDemandLabel}>Physical Demand Tags</Text>
                    <TouchableOpacity
                      style={styles.dropdownTrigger}
                      onPress={() => setShowPhysicalDemandDropdown(!showPhysicalDemandDropdown)}
                    >
                      <Text style={styles.dropdownTriggerText}>
                        {selectedPhysicalDemandTags.length > 0 
                          ? `${selectedPhysicalDemandTags.length} selected`
                          : 'Select tags...'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#07bbc0" />
                    </TouchableOpacity>
                    {showPhysicalDemandDropdown && (
                      <>
                        <TouchableOpacity
                          style={styles.dropdownOverlay}
                          activeOpacity={1}
                          onPress={() => setShowPhysicalDemandDropdown(false)}
                        />
                        <View style={styles.dropdown}>
                          <ScrollView style={styles.dropdownScroll}>
                            {physicalDemandTags.map((tag) => (
                              <TouchableOpacity
                                key={tag}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  togglePhysicalDemandTag(tag);
                                }}
                              >
                                <View style={[
                                  styles.checkbox,
                                  selectedPhysicalDemandTags.includes(tag) && styles.checkboxChecked
                                ]}>
                                  {selectedPhysicalDemandTags.includes(tag) && (
                                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                                  )}
                                </View>
                                <Text style={styles.dropdownItemText}>{tag}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </>
                    )}
                    {selectedPhysicalDemandTags.length > 0 && (
                      <View style={styles.selectedTagsContainer}>
                        {selectedPhysicalDemandTags.map((tag) => (
                          <View key={tag} style={styles.tag}>
                            <View style={styles.tagDot} />
                            <Text style={styles.tagText}>{tag}</Text>
                            <TouchableOpacity onPress={() => togglePhysicalDemandTag(tag)}>
                              <Ionicons name="close" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Thumbnail Upload */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Thumbnail</Text>
                  <TouchableOpacity 
                    style={styles.thumbnailUpload}
                    onPress={handleThumbnailUpload}
                  >
                    {thumbnail ? (
                      <Image source={{ uri: thumbnail }} style={styles.thumbnailImage} />
                    ) : (
                      <>
                        <Ionicons name="image-outline" size={48} color="#07bbc0" />
                        <Text style={styles.thumbnailUploadText}>Upload Thumbnail</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  {Platform.OS === 'web' && (
                    <input
                      ref={thumbnailInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        handleWebThumbnailChange(e);
                        if (errors.thumbnail) {
                          setErrors(prev => ({ ...prev, thumbnail: '' }));
                        }
                      }}
                    />
                  )}
                  {errors.thumbnail ? <Text style={styles.errorText}>{errors.thumbnail}</Text> : null}
                </View>
              </View>

              {/* Right Column */}
              <View style={styles.rightColumn}>
                {/* Module Information */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Module Information</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Module Title</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[styles.input, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        value={moduleTitle}
                        placeholder="(e.g, Basic Palm Strike)"
                        placeholderTextColor="#6b8693"
                        onChangeText={(text) => {
                          if (text.length <= 50) {
                            setModuleTitle(text);
                            if (errors.moduleTitle) {
                              setErrors(prev => ({ ...prev, moduleTitle: validateModuleTitle(text) }));
                            }
                          }
                        }}
                        maxLength={50}
                      />
                    </View>
                    <View style={styles.charCounterContainer}>
                      <Text style={styles.charCounterText}>
                        {moduleTitle.length}/50
                      </Text>
                    </View>
                    {errors.moduleTitle ? <Text style={styles.errorText}>{errors.moduleTitle}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Description</Text>
                    <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                      <TextInput
                        style={[styles.input, styles.textArea, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                        value={description}
                        placeholder="Brief description..."
                        placeholderTextColor="#6b8693"
                        onChangeText={(text) => {
                          if (text.length <= 600) {
                            setDescription(text);
                            if (errors.description) {
                              setErrors(prev => ({ ...prev, description: validateDescription(text) }));
                            }
                          }
                        }}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                        maxLength={600}
                      />
                      <View style={styles.charCounterBottomRight}>
                        <Text style={styles.charCounterText}>
                          {description.length}/600
                        </Text>
                      </View>
                    </View>
                    {errors.description ? <Text style={styles.errorText}>{errors.description}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Category</Text>
                    <TouchableOpacity
                      style={styles.selectInput}
                      onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                    >
                      <Text style={category ? styles.selectedText : styles.placeholderText}>
                        {category || 'Select category...'}
                      </Text>
                      <Ionicons name="chevron-down" size={20} color="#07bbc0" />
                    </TouchableOpacity>
                    {showCategoryDropdown && (
                      <>
                        <TouchableOpacity
                          style={styles.dropdownOverlay}
                          activeOpacity={1}
                          onPress={() => setShowCategoryDropdown(false)}
                        />
                        <View style={styles.dropdown}>
                          <ScrollView style={styles.dropdownScroll}>
                            {categories.map((cat) => (
                              <TouchableOpacity
                                key={cat}
                                style={styles.dropdownItem}
                                onPress={() => {
                                  setCategory(cat);
                                  setShowCategoryDropdown(false);
                                  if (errors.category) {
                                    setErrors(prev => ({ ...prev, category: validateCategory(cat) }));
                                  }
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{cat}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      </>
                    )}
                    {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Introduction</Text>
                    
                    {/* Toggle between text and video */}
                    <View style={styles.toggleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.toggleOption,
                          introductionType === 'text' && styles.toggleOptionActive
                        ]}
                        onPress={() => setIntroductionType('text')}
                      >
                        <Ionicons 
                          name="text-outline" 
                          size={18} 
                          color={introductionType === 'text' ? '#FFFFFF' : '#6b8693'} 
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[
                          styles.toggleOptionText,
                          introductionType === 'text' && styles.toggleOptionTextActive
                        ]}>
                          Write Text
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.toggleOption,
                          introductionType === 'video' && styles.toggleOptionActive
                        ]}
                        onPress={() => setIntroductionType('video')}
                      >
                        <Ionicons 
                          name="videocam-outline" 
                          size={18} 
                          color={introductionType === 'video' ? '#FFFFFF' : '#6b8693'} 
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[
                          styles.toggleOptionText,
                          introductionType === 'video' && styles.toggleOptionTextActive
                        ]}>
                          Upload Video
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {introductionType === 'text' ? (
                      <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
                        <TextInput
                          style={[styles.input, styles.textArea, { outlineStyle: 'none', outlineWidth: 0, outlineColor: 'transparent' } as any]}
                          value={introduction}
                          placeholder="Detailed introduction..."
                          placeholderTextColor="#6b8693"
                          onChangeText={setIntroduction}
                          multiline
                          numberOfLines={6}
                          textAlignVertical="top"
                        />
                      </View>
                    ) : (
                      <View>
                        {!introductionVideo ? (
                          <View
                            ref={introductionVideoDropZoneRef}
                            style={[
                              styles.dropZone,
                              isDraggingIntroductionVideo && styles.dropZoneDragging
                            ]}
                          >
                            <TouchableOpacity 
                              style={styles.dropZoneContent}
                              onPress={() => {
                                if (Platform.OS === 'web' && introductionVideoInputRef.current) {
                                  introductionVideoInputRef.current.click();
                                } else {
                                  handleIntroductionVideoUpload();
                                }
                              }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="cloud-upload-outline" size={32} color="#07bbc0" />
                              <Text style={styles.dropZoneText}>Drop or Click to Upload Video</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={styles.videoPlayerContainer}>
                            {/* Delete Button */}
                            <TouchableOpacity
                              style={styles.videoDeleteButton}
                              onPress={() => {
                                setIntroductionVideo(null);
                                if (introductionVideoPlayerRef.current) {
                                  introductionVideoPlayerRef.current.pause();
                                  introductionVideoPlayerRef.current.src = '';
                                }
                                showToast('Introduction video removed');
                              }}
                            >
                              <Ionicons name="close-circle" size={28} color="#FF6B6B" />
                            </TouchableOpacity>
                            
                            {/* Video Element */}
                            {Platform.OS === 'web' ? (
                              <video
                                ref={(ref) => { introductionVideoPlayerRef.current = ref; }}
                                src={introductionVideo.uri}
                                controls
                                style={styles.videoPlayer as any}
                                playsInline
                              />
                            ) : (
                              <View style={styles.videoPlayer}>
                                <Text style={styles.videoPlayerText}>Video: {introductionVideo.name}</Text>
                                <Text style={styles.videoPlayerSubtext}>Video playback available on web</Text>
                              </View>
                            )}
                          </View>
                        )}
                        {Platform.OS === 'web' && (
                          <input
                            ref={introductionVideoInputRef}
                            type="file"
                            accept="video/*"
                            style={{ display: 'none' }}
                            onChange={handleIntroductionVideoChange}
                          />
                        )}
                      </View>
                    )}
                  </View>
                </View>

              </View>
            </View>
            
            {/* Certification & Publishing - Bottom Center */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={styles.certificationCheckbox}
                onPress={() => setCertificationChecked(!certificationChecked)}
              >
                <View style={[
                  styles.checkbox,
                  styles.checkboxLarge,
                  certificationChecked && styles.checkboxChecked
                ]}>
                  {certificationChecked && (
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.certificationText}>
                  I certify this technique is appropriate and valid for self defense
                </Text>
              </TouchableOpacity>

              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handlePublish}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Upload & Submit for Review</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        visible={toastVisible}
        onHide={hideToast}
        duration={3000}
      />

      {/* Pop-up Menu */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.menuContainer}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleMessages}
            >
              <Image
                source={require('../../assets/images/messageicon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Messages</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <Image
                source={require('../../assets/images/logouticon.png')}
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#041527' },
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    backgroundColor: '#000E1C',
    width: 80,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sidebarIconsBottom: {
    flexDirection: 'column',
    width: '100%',
    alignItems: 'center',
  },
  sidebarButton: {
    paddingVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  sidebarActive: {
    backgroundColor: '#024446',
  },
  iconImage: {
    width: 28,
    height: 28,
    tintColor: '#07bbc0',
    resizeMode: 'contain',
  },
  sidebarTopButton: {
    padding: 8,
  },
  threeDotIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    gap: 24,
    alignItems: 'flex-start',
  },
  leftColumn: {
    flex: 1,
    minWidth: 400,
  },
  rightColumn: {
    flex: 1,
    minWidth: 400,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#07bbc0',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  videoLimitNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#07bbc0',
  },
  videoLimitText: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  videoInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a3645',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  videoInfoText: {
    color: '#FFFFFF',
    fontSize: 12,
    flex: 1,
  },
  dropZone: {
    borderWidth: 2,
    borderColor: '#07bbc0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#011f36',
    marginBottom: 12,
    minHeight: 120,
  },
  dropZoneDragging: {
    borderColor: '#09AEC3',
    backgroundColor: 'rgba(7, 187, 192, 0.15)',
    borderWidth: 3,
  },
  dropZoneContent: {
    width: '100%',
    height: '100%',
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropZoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#0a3645',
  },
  orText: {
    color: '#6b8693',
    fontSize: 12,
    marginHorizontal: 12,
  },
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#011f36',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  browseButtonText: {
    color: '#07bbc0',
    fontSize: 14,
    fontWeight: '600',
  },
  linkInput: {
    backgroundColor: '#011f36',
    borderRadius: 8,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  videoPlayerContainer: {
    position: 'relative',
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#011f36',
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  videoPlayer: {
    width: '100%',
    height: 300,
    backgroundColor: '#000000',
    borderRadius: 8,
  },
  videoDeleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  videoPlayerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 20,
  },
  videoPlayerSubtext: {
    color: '#6b8693',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  videoLinkContainer: {
    position: 'relative',
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    padding: 16,
    minHeight: 80,
  },
  videoLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingRight: 40,
  },
  videoLinkText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#07bbc0',
  },
  intensityContainer: {
    marginBottom: 24,
  },
  intensityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  sliderContainer: {
    marginBottom: 8,
  },
  sliderTrack: {
    height: 6,
    backgroundColor: '#0a3645',
    borderRadius: 3,
    position: 'relative',
    marginBottom: 16,
  },
  sliderFill: {
    height: '100%',
    backgroundColor: '#07bbc0',
    borderRadius: 3,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    position: 'absolute',
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#07bbc0',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderThumbDragging: {
    shadowColor: '#07bbc0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sliderLabel: {
    flex: 1,
    alignItems: 'center',
  },
  sliderLabelText: {
    color: '#6b8693',
    fontSize: 14,
    fontWeight: '600',
  },
  sliderLabelTextActive: {
    color: '#07bbc0',
  },
  spaceRequirementContainer: {
    marginBottom: 24,
  },
  spaceRequirementLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  checkboxGroup: {
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#07bbc0',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLarge: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  checkboxChecked: {
    backgroundColor: '#07bbc0',
    borderColor: '#07bbc0',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  physicalDemandContainer: {
    marginBottom: 24,
  },
  physicalDemandLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#011f36',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#0a3645',
  },
  dropdownTriggerText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  dropdown: {
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    marginTop: 4,
    maxHeight: 200,
    zIndex: 10,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0a3645',
  },
  dropdownItemText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
  },
  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#0a3645',
    gap: 6,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#07bbc0',
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  thumbnailUpload: {
    borderWidth: 2,
    borderColor: '#07bbc0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#011f36',
    aspectRatio: 16 / 9,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  thumbnailUploadText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 12,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
    position: 'relative',
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  textArea: {
    minHeight: 180,
    paddingTop: 0,
    paddingBottom: 24,
  },
  charCounterContainer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  charCounterBottomRight: {
    position: 'absolute',
    bottom: 8,
    right: 12,
  },
  charCounterText: {
    color: '#6b8693',
    fontSize: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    backgroundColor: '#011f36',
  },
  toggleOptionActive: {
    borderColor: '#07bbc0',
    backgroundColor: '#024446',
  },
  toggleOptionText: {
    color: '#6b8693',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
  },
  uploadedFilePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  removeFileButton: {
    padding: 4,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#011f36',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0a3645',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectedText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  placeholderText: {
    color: '#6b8693',
    fontSize: 14,
  },
  bottomSection: {
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
    marginTop: 20,
  },
  certificationCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    maxWidth: 600,
    width: '100%',
  },
  certificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    lineHeight: 20,
  },
  actionButtons: {
    gap: 12,
    width: '100%',
    maxWidth: 600,
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#07bbc0',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  menuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuContainer: {
    position: 'absolute',
    top: 20,
    left: 90,
    backgroundColor: '#011f36',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#6b8693',
    paddingVertical: 10,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  menuIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  menuText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});
