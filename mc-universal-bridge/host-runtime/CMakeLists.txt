cmake_minimum_required(VERSION 3.25)
project(mcub_host LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable(mcub-host
    src/runtime_main.cpp
    src/shared_link.cpp
)
target_include_directories(mcub-host PRIVATE
    ../protocol
    ../host-sdk/include
    src
)
target_compile_definitions(mcub-host PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX)

add_library(mcub-fake-adapter SHARED
    ../examples/fake-adapter/fake_adapter.cpp
)
target_include_directories(mcub-fake-adapter PRIVATE
    ../protocol
    ../host-sdk/include
)
target_compile_definitions(mcub-fake-adapter PRIVATE WIN32_LEAN_AND_MEAN NOMINMAX)

if(MSVC)
    target_compile_options(mcub-host PRIVATE /W4 /permissive-)
    target_compile_options(mcub-fake-adapter PRIVATE /W4 /permissive-)
endif()
