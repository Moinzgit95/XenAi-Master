'use client';

import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { FadeIn, SlideIn } from '@/components/ui/motion';
import Header from '@/components/sections/Header';

export default function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'name':
        if (!value.trim()) {
          error = 'Name is required';
        } else if (value.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else {
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(value)) {
            error = 'Please enter a valid email address';
          }
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'Phone number is required';
        } else {
          const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
          if (!phoneRegex.test(value)) {
            error = 'Please enter a valid phone number';
          }
        }
        break;
      case 'message':
        if (!value.trim()) {
          error = 'Message is required';
        } else if (value.trim().length < 10) {
          error = 'Message must be at least 10 characters';
        }
        break;
      default:
        break;
    }
    
    return error;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Phone number validation - only allow numbers, +, -, (, ), and spaces
    if (name === 'phone') {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]*$/;
      if (!phoneRegex.test(value)) {
        return; // Don't update if invalid characters
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleInputBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    setFieldErrors(prev => ({
      ...prev,
      [name]: error
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('');

    // Validate all fields
    const errors = {};
    let hasErrors = false;

    // Check each field
    Object.keys(formData).forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        errors[field] = error;
        hasErrors = true;
      }
    });

    // If there are validation errors, show them and stop submission
    if (hasErrors) {
      setFieldErrors(errors);
      setIsSubmitting(false);
      setSubmitStatus('error');
      return;
    }

    try {
      // EmailJS configuration with your actual credentials
      const serviceId = 'service_f8lw5sk';
      const templateId = 'template_evyn7e3'; // Template for developer
      const userTemplateId = 'template_rhtw5gr'; // User confirmation template ID
      const publicKey = 'czJsezpsvsDqsKdAK';

      // Prepare template parameters for developer email
      const developerTemplateParams = {
        from_name: formData.name,
        from_email: formData.email,
        from_phone: formData.phone,
        message: formData.message,
        to_email: 'syedabdulla442@gmail.com',
        reply_to: formData.email,
        // Alternative variable names that might be expected
        user_name: formData.name,
        user_email: formData.email,
        user_phone: formData.phone,
        user_message: formData.message,
        contact_name: formData.name,
        contact_email: formData.email,
        contact_phone: formData.phone,
        contact_message: formData.message,
        // Additional variables for recipient
        to_name: 'Syed',
        recipient_email: 'syedabdulla442@gmail.com',
        recipient: 'syedabdulla442@gmail.com'
      };

      // Prepare template parameters for user confirmation email
      const userTemplateParams = {
        to_name: formData.name,
        to_email: formData.email,
        user_name: formData.name,
        user_email: formData.email,
        user_phone: formData.phone,
        user_message: formData.message,
        from_name: 'Xen.ai Team',
        from_email: 'syedabdulla442@gmail.com',
        // Additional variables to ensure compatibility
        from_name: formData.name,
        from_email: formData.email,
        from_phone: formData.phone,
        message: formData.message
      };

      // Send email to developer
      console.log('📧 Sending email to developer with params:', developerTemplateParams);
      const developerResult = await emailjs.send(serviceId, templateId, developerTemplateParams, publicKey);
      console.log('✅ Email sent to developer successfully:', developerResult);

      // Send confirmation email to user
      console.log('📧 Sending confirmation email to user with params:', userTemplateParams);
      const userResult = await emailjs.send(serviceId, userTemplateId, userTemplateParams, publicKey);
      console.log('✅ Confirmation email sent to user successfully:', userResult);
      
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('❌ EmailJS Error Details:', error);
      console.error('❌ Error Status:', error.status);
      console.error('❌ Error Text:', error.text);
      console.error('❌ Full Error Object:', JSON.stringify(error, null, 2));
      
      // Show more specific error message
      if (error.status === 400) {
        setSubmitStatus('error');
        alert('Template or service configuration error. Please check your EmailJS setup.');
      } else if (error.status === 401) {
        setSubmitStatus('error');
        alert('Authentication error. Please check your public key.');
      } else {
        setSubmitStatus('error');
        alert(`Email sending failed: ${error.text || error.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-white">
      <Header />
      <div className="container mx-auto px-4 py-24 pt-32">
        <FadeIn className="max-w-4xl mx-auto">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-6">
              Contact Us
            </h1>
            <SlideIn delay={0.2}>
              <p className="text-lg md:text-xl text-white/80 mb-6">
                Have questions, feedback, or need support? We're here to help!
              </p>
            </SlideIn>
          </div>

          {/* Contact Form */}
          <SlideIn delay={0.4}>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    required
                    className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      fieldErrors.name 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                    placeholder="Enter your full name"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.name}</p>
                  )}
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    required
                    pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                    title="Please enter a valid email address (e.g., user@gmail.com)"
                    className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      fieldErrors.email 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                    placeholder="Enter your email address (e.g., user@gmail.com)"
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.email}</p>
                  )}
                </div>

                {/* Phone Field */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-2">
                    Phone Number (with Country Code) *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    required
                    pattern="[\+]?[0-9\s\-\(\)]{10,}"
                    title="Please enter a valid phone number (e.g., +1 (555) 123-4567)"
                    className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 ${
                      fieldErrors.phone 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                    placeholder="e.g., +1 (555) 123-4567"
                  />
                  {fieldErrors.phone && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.phone}</p>
                  )}
                </div>

                {/* Message Field */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    onBlur={handleInputBlur}
                    required
                    rows={5}
                    className={`w-full px-4 py-3 bg-gray-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-200 resize-none ${
                      fieldErrors.message 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-gray-600 focus:ring-blue-500'
                    }`}
                    placeholder="Tell us how we can help you..."
                  />
                  {fieldErrors.message && (
                    <p className="mt-1 text-sm text-red-400">{fieldErrors.message}</p>
                  )}
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Sending...
                      </div>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </div>

                {/* Status Messages */}
                {submitStatus === 'success' && (
                  <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg text-green-300 text-center">
                    ✅ Message sent successfully! We'll get back to you soon.
                  </div>
                )}
                {submitStatus === 'error' && (
                  <div className="mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-center">
                    ❌ Please fill in all required fields correctly before submitting.
                  </div>
                )}
              </form>
            </div>
          </SlideIn>

          {/* Alternative Contact Info */}
          <SlideIn delay={0.6}>
            <div className="text-center mt-12">
              <p className="text-lg text-white/70 mb-4">
                Prefer email? You can also reach us directly at:
              </p>
              <a 
                href="mailto:syedabdulla442@gmail.com" 
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                Syedabdulla442@gmail.com
              </a>
            </div>
          </SlideIn>
        </FadeIn>
      </div>
    </div>
  );
} 