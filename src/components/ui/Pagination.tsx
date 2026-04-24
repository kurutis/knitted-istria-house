'use client'

import { motion } from "framer-motion"

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export default function Pagination({currentPage, totalPages, onPageChange}: PaginationProps) {
    const getPageNumbers = () => {
        const pages = []
        const maxVisible = window.innerWidth < 640 ? 3 : 5
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++){
                pages.push(i)
            }
        } else {
            if (currentPage <= 3){
                for (let i =1; i <= (maxVisible - 1); i++) pages.push(i)
                pages.push('...')
                pages.push(totalPages)    
            } else if (currentPage >= totalPages - 2){
                pages.push(1)
                pages.push('...')
                for (let i = totalPages - (maxVisible - 2); i <= totalPages; i++) pages.push(i) 
            } else {
                pages.push(1)
                pages.push('...')
                pages.push(currentPage - 1)
                pages.push(currentPage)
                pages.push(currentPage + 1)
                pages.push('...')
                pages.push(totalPages)
            }
        }
        return pages
    }
    
    if (totalPages <= 1) return null

    return (
        <div className="flex justify-center gap-1 sm:gap-2 flex-wrap">
            <motion.button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white shadow-md hover:bg-[#EAEAEA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                ←
            </motion.button>
            
            {getPageNumbers().map((page, index) => (
                <motion.button 
                    key={index} 
                    onClick={() => typeof page === 'number' && onPageChange(page)} 
                    disabled={page === '...'} 
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg transition-colors flex items-center justify-center text-sm sm:text-base ${
                        page === currentPage 
                            ? 'bg-firm-orange text-white' 
                            : page === '...' 
                                ? 'bg-transparent cursor-default' 
                                : 'bg-white shadow-md hover:bg-[#EAEAEA]'
                    }`}
                    whileHover={page !== '...' && page !== currentPage ? { scale: 1.05 } : {}}
                    whileTap={page !== '...' && page !== currentPage ? { scale: 0.95 } : {}}
                >
                    {page}
                </motion.button>
            ))}
            
            <motion.button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages} 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white shadow-md hover:bg-[#EAEAEA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm sm:text-base"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
            >
                →
            </motion.button>
        </div>
    )
}