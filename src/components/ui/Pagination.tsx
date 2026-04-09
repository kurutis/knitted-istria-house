'use client'

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
}

export default function Pagination({currentPage, totalPages, onPageChange}: PaginationProps) {
    const getPageNumbers = () => {
        const pages = []
        const maxVisible = 5
        
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++){
                pages.push(i)
            }
        } else {
            if (currentPage <= 3){
                for (let i =1; i <=4; i++) pages.push(i)
                pages.push('...')
                pages.push(totalPages)    
            } else if (currentPage >= totalPages - 2){
                pages.push(1)
                pages.push('...')
                for (let i = totalPages-3; i <= totalPages; i++) pages.push(i) 
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
        <div className="flex justify-center gap-2">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="w-10 h-10 rounded-lg bg-white shadow-md hover:bg-[#EAEAEA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">←</button>
            {getPageNumbers().map((page, index) => (<button key={index} onClick={() => typeof page === 'number' && onPageChange(page)} disabled={page === '...'} className={`w-10 h-10 rounded-lg transition-colors ${page === currentPage ? 'bg-firm-orange text-white' : page === '...' ? 'bg-transparent cursor-default' : 'bg-white shadow-md hover:bg-[#EAEAEA]'}`}>{page}</button>))}
            <button  onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="w-10 h-10 rounded-lg bg-white shadow-md hover:bg-[#EAEAEA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">→</button>
        </div>
    )
}