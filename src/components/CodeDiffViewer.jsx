import React from 'react';
import PropTypes from 'prop-types';
import { CodeDiff } from '../utils/codeCompare';
import { X, Check, GitMerge } from 'lucide-react';

const CodeDiffViewer = ({ diffs, onAccept, onReject }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-xl w-4/5 max-w-4xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center px-4 py-3 border-b border-[#3c3c3c]">
          <h3 className="text-white font-medium">Review the suggested changes</h3>
          <div className="flex space-x-2">
            <button
              onClick={onReject}
              className="px-3 py-1 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white rounded flex items-center space-x-1"
            >
              <X size={16} />
              <span>Reject</span>
            </button>
            <button
              onClick={onAccept}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center space-x-1"
            >
              <GitMerge size={16} className="text-green-400" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
        
        <div className="overflow-auto p-4 flex-1">
          <pre className="font-mono text-sm leading-relaxed">
            {diffs.map((diff, index) => (
              <div
                key={index}
                className={`
                  ${diff.added ? 'bg-green-900/30 border-l-4 border-green-500' : ''}
                  ${diff.removed ? 'bg-red-900/30 border-l-4 border-red-500' : ''}
                  px-2 py-0.5
                `}
              >
                {diff.value.split('\n').map((line, lineIndex, array) =>
                  lineIndex === array.length - 1 && line === '' ? null : (
                    <div key={lineIndex} className="whitespace-pre">
                      {diff.added && <span className="text-green-500 mr-2">+</span>}
                      {diff.removed && <span className="text-red-500 mr-2">-</span>}
                      {line}
                    </div>
                  )
                )}
              </div>
            ))}
          </pre>
        </div>
      </div>
    </div>
  );
};

CodeDiffViewer.propTypes = {
  diffs: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      added: PropTypes.bool,
      removed: PropTypes.bool
    })
  ).isRequired,
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired
};

export default CodeDiffViewer;