import { type ReactNode } from 'react'
import { Disclosure, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { BellIcon } from '@heroicons/react/24/outline'

interface HeaderProps {
  children: ReactNode;
  currentPage: string;
  hideNav?: boolean;
}

const user = {
  imageUrl: '/person-295.svg'
}

const navigation = [
  { name: 'Transactions', href: '/transactions', current: false },
  { name: 'Dashboard', href: '/dashboard', current: false },
]

const userNavigation = [
  { name: 'Your profile', href: '#' },
  { name: 'Settings', href: '#' },
  { name: 'Sign out', href: '/login' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export default function Header({ children, currentPage, hideNav = false }: HeaderProps) {
  // Update navigation items based on current page
  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: item.name === currentPage
  }))

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-50">
        <Disclosure as="nav" className="bg-gray-800">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center">
                <div className="shrink-0">
                  <img
                    alt="Soraban"
                    src="/logoipsum-415.svg"
                    className="size-8"
                  />
                </div>
                {!hideNav && (
                  <div className="hidden md:block">
                    <div className="ml-10 flex items-baseline space-x-4">
                      {updatedNavigation.map((item) => (
                        <a
                          key={item.name}
                          href={item.href}
                          aria-current={item.current ? 'page' : undefined}
                          className={classNames(
                            item.current ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white',
                            'rounded-md px-3 py-2 text-sm font-medium',
                          )}
                        >
                          {item.name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {!hideNav && (
                <div className="hidden md:block">
                  <div className="ml-4 flex items-center md:ml-6">
                    <button
                      type="button"
                      className="relative rounded-full p-1 text-gray-400 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500"
                    >
                      <span className="absolute -inset-1.5" />
                      <span className="sr-only">View notifications</span>
                      <BellIcon aria-hidden="true" className="size-6" />
                    </button>

                    {/* Profile dropdown */}
                    <Menu as="div" className="relative ml-3">
                      <MenuButton className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500">
                        <span className="absolute -inset-1.5" />
                        <span className="sr-only">Open user menu</span>
                        <img
                          alt=""
                          src={user.imageUrl}
                          className="size-8 rounded-full outline -outline-offset-1 outline-white/10"
                        />
                      </MenuButton>

                      <MenuItems
                        transition
                        anchor="bottom end"
                        className="z-50 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline-1 outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in"
                      >
                        {userNavigation.map((item) => (
                          <MenuItem key={item.name}>
                            <a
                              href={item.href}
                              className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden"
                            >
                              {item.name}
                            </a>
                          </MenuItem>
                        ))}
                      </MenuItems>
                    </Menu>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Disclosure>
      </header>
      {children}
    </div>
  )
}
